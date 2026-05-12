'use server';

import { db, type DB } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { validatePassword } from '@/lib/auth/passwordValidator';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';

export type RegisterResult =
  | { success: true }
  | { success: false; errors: Record<string, string> };

export async function register(formData: FormData, dbInstance: DB = db): Promise<RegisterResult> {
  const displayName = (formData.get('displayName') as string | null)?.trim() ?? '';
  const email = (formData.get('email') as string | null)?.toLowerCase().trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  const errors: Record<string, string> = {};

  if (!displayName) {
    errors.displayName = 'Display name is required';
  }

  if (!email) {
    errors.email = 'Email is required';
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.errors.join('. ');
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Check for duplicate email (generic error — no account existence leak)
  const existing = await dbInstance.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { success: false, errors: { email: 'Registration failed. Please check your details.' } };
  }

  const passwordHash = hashSync(password, 12);

  await dbInstance.insert(users).values({
    id: randomUUID(),
    displayName,
    email,
    passwordHash,
    role: 'submitter',
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: Math.floor(Date.now() / 1000),
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
