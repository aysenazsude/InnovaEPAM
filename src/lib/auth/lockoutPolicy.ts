import type { User } from '@/lib/db/schema';
import type { DB } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { LOCKOUT_ATTEMPTS, LOCKOUT_DURATION_SECONDS } from '@/lib/constants';

export function isLocked(user: Pick<User, 'failedLoginCount' | 'lockedUntil'>): boolean {
  if (user.lockedUntil === null || user.lockedUntil === undefined) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return user.failedLoginCount >= LOCKOUT_ATTEMPTS && user.lockedUntil > nowSeconds;
}

export async function incrementFailures(db: DB, userId: string): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const newCount = user.failedLoginCount + 1;
  const lockedUntil =
    newCount >= LOCKOUT_ATTEMPTS ? nowSeconds + LOCKOUT_DURATION_SECONDS : user.lockedUntil;

  await db
    .update(users)
    .set({ failedLoginCount: newCount, lockedUntil })
    .where(eq(users.id, userId));
}

export async function resetFailures(db: DB, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, userId));
}

export function getLockExpiry(nowSeconds: number): number {
  return nowSeconds + LOCKOUT_DURATION_SECONDS;
}
