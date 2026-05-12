import type { User } from '@/lib/db/schema';

let userCounter = 1;

function makeTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function createSubmitter(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? `user-submitter-${userCounter++}`;
  return {
    id,
    displayName: overrides.displayName ?? 'Test Submitter',
    email: overrides.email ?? `submitter-${id}@example.com`,
    passwordHash: overrides.passwordHash ?? '$2a$12$hashedpassword',
    role: 'submitter',
    failedLoginCount: overrides.failedLoginCount ?? 0,
    lockedUntil: overrides.lockedUntil ?? null,
    createdAt: overrides.createdAt ?? makeTimestamp(),
    ...overrides,
  };
}

export function createAdmin(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? `user-admin-${userCounter++}`;
  return {
    id,
    displayName: overrides.displayName ?? 'Test Admin',
    email: overrides.email ?? `admin-${id}@example.com`,
    passwordHash: overrides.passwordHash ?? '$2a$12$hashedpassword',
    role: 'admin',
    failedLoginCount: overrides.failedLoginCount ?? 0,
    lockedUntil: overrides.lockedUntil ?? null,
    createdAt: overrides.createdAt ?? makeTimestamp(),
    ...overrides,
  };
}
