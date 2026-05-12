import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('sessionManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isSessionExpired', () => {
    it('should return false when session is within 8 hours', async () => {
      const { isSessionExpired } = await import('@/lib/auth/sessionManager');
      const nowSeconds = Math.floor(Date.now() / 1000);
      // expires 4 hours from now
      const expires = new Date((nowSeconds + 4 * 3600) * 1000).toISOString();
      expect(isSessionExpired({ expires })).toBe(false);
    });

    it('should return true when session has expired', async () => {
      const { isSessionExpired } = await import('@/lib/auth/sessionManager');
      const nowSeconds = Math.floor(Date.now() / 1000);
      // expires 1 second ago
      const expires = new Date((nowSeconds - 1) * 1000).toISOString();
      expect(isSessionExpired({ expires })).toBe(true);
    });
  });

  describe('buildReturnUrl', () => {
    it('should encode the path as a returnUrl query param', async () => {
      const { buildReturnUrl } = await import('@/lib/auth/sessionManager');
      const result = buildReturnUrl('/ideas/IDEA-0001');
      expect(result).toBe('/login?returnUrl=%2Fideas%2FIDEA-0001');
    });

    it('should handle paths without special characters', async () => {
      const { buildReturnUrl } = await import('@/lib/auth/sessionManager');
      const result = buildReturnUrl('/admin');
      expect(result).toBe('/login?returnUrl=%2Fadmin');
    });
  });

  describe('getRoleHome', () => {
    it('should return /ideas for submitter role', async () => {
      const { getRoleHome } = await import('@/lib/auth/sessionManager');
      expect(getRoleHome('submitter')).toBe('/ideas');
    });

    it('should return /admin for admin role', async () => {
      const { getRoleHome } = await import('@/lib/auth/sessionManager');
      expect(getRoleHome('admin')).toBe('/admin');
    });

    it('should default to /ideas for unknown role', async () => {
      const { getRoleHome } = await import('@/lib/auth/sessionManager');
      expect(getRoleHome('unknown')).toBe('/ideas');
    });
  });
});
