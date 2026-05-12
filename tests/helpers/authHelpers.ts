import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import * as schema from '@/lib/db/schema';
import { users, ideas } from '@/lib/db/schema';
import { hashSync } from 'bcryptjs';
import { randomUUID } from 'crypto';

export type TestDB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates an in-memory SQLite database with the full schema applied.
 * Use this in integration tests instead of the real DB singleton.
 */
export function createTestDb(): TestDB {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src/lib/db/migrations') });
  return db;
}

export async function loginAs(
  db: TestDB,
  role: 'submitter' | 'admin',
  overrides: Partial<typeof schema.users.$inferInsert> = {}
): Promise<typeof schema.users.$inferSelect> {
  const id = randomUUID();
  const email = overrides.email ?? `${role}-${id}@test.com`;
  const [user] = await db
    .insert(users)
    .values({
      id,
      displayName: overrides.displayName ?? `Test ${role}`,
      email,
      passwordHash: hashSync('Password1', 12),
      role,
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: Math.floor(Date.now() / 1000),
      ...overrides,
    })
    .returning();
  return user;
}

export async function registerUser(
  db: TestDB,
  overrides: Partial<typeof schema.users.$inferInsert> = {}
): Promise<typeof schema.users.$inferSelect> {
  return loginAs(db, 'submitter', overrides);
}
