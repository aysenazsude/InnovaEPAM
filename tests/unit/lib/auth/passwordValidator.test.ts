import { describe, it, expect } from '@jest/globals';
import { validatePassword } from '@/lib/auth/passwordValidator';

describe('validatePassword', () => {
  it('should return valid for a password meeting all requirements', () => {
    const result = validatePassword('SecurePass1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject a password shorter than 8 characters', () => {
    const result = validatePassword('Abc1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('should reject a password missing an uppercase letter', () => {
    const result = validatePassword('securepass1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject a password missing a lowercase letter', () => {
    const result = validatePassword('SECUREPASS1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject a password missing a digit', () => {
    const result = validatePassword('SecurePassword');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should return multiple errors when multiple rules are violated', () => {
    const result = validatePassword('short');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should reject an empty string', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });
});
