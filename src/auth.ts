import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';
import { isLocked, incrementFailures, resetFailures } from '@/lib/auth/lockoutPolicy';
import authConfig from '@/auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) return null;

        if (isLocked(user)) return null;

        const passwordMatch = await compare(password, user.passwordHash);

        if (!passwordMatch) {
          await incrementFailures(db, user.id);
          return null;
        }

        await resetFailures(db, user.id);

        return {
          id: user.id,
          name: user.displayName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
