import type { UserRole } from '@/lib/db/schema';

export function isSessionExpired(session: { expires: string }): boolean {
  const expiresMs = new Date(session.expires).getTime();
  return expiresMs <= Date.now();
}

export function buildReturnUrl(path: string): string {
  return `/login?returnUrl=${encodeURIComponent(path)}`;
}

export function getRoleHome(role: string): string {
  if (role === 'admin') return '/admin';
  return '/ideas';
}
