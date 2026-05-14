import { describe, it, expect } from '@jest/globals';
import { isSessionExpired, buildReturnUrl, getRoleHome } from '@/lib/auth/sessionManager';

describe('middleware session guard (unit integration)', () => {
  it('should detect an expired session', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isSessionExpired({ expires: past })).toBe(true);
  });

  it('should pass through a valid session', () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    expect(isSessionExpired({ expires: future })).toBe(false);
  });

  it('should build returnUrl preserving original path', () => {
    const result = buildReturnUrl('/ideas/new');
    expect(result).toBe('/login?returnUrl=%2Fideas%2Fnew');
  });

  it('should redirect submitter to /home on successful session', () => {
    expect(getRoleHome('submitter')).toBe('/home');
  });

  it('should redirect admin to /admin on successful session', () => {
    expect(getRoleHome('admin')).toBe('/admin');
  });
});
