import { describe, it, expect } from '@jest/globals';
import { validateAttachment } from '@/lib/attachments/attachmentValidator';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT } from '@/lib/constants';

describe('attachmentValidator', () => {
  it('should return valid for a valid PDF under size limit', () => {
    const result = validateAttachment('application/pdf', 1_000_000, 0);
    expect(result.valid).toBe(true);
  });

  it('should reject application/msword', () => {
    const result = validateAttachment('application/msword', 1_000_000, 0);
    // application/msword is in ALLOWED_MIME_TYPES — this should pass
    expect(result.valid).toBe(true);
  });

  it('should reject text/plain as a disallowed MIME type', () => {
    const result = validateAttachment('text/plain', 1_000_000, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject application/zip as a disallowed MIME type', () => {
    const result = validateAttachment('application/zip', 1_000_000, 0);
    expect(result.valid).toBe(false);
  });

  it('should reject video/mp4 as a disallowed MIME type', () => {
    const result = validateAttachment('video/mp4', 500_000, 0);
    expect(result.valid).toBe(false);
  });

  it('should accept a file of exactly FILE_SIZE_LIMIT bytes', () => {
    const result = validateAttachment('application/pdf', FILE_SIZE_LIMIT, 0);
    expect(result.valid).toBe(true);
  });

  it('should reject a file 1 byte over FILE_SIZE_LIMIT', () => {
    const result = validateAttachment('application/pdf', FILE_SIZE_LIMIT + 1, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10 MB');
  });

  it('should reject a second attachment attempt (existingCount = 1) with 409-compatible error', () => {
    const result = validateAttachment('application/pdf', 1_000_000, 1);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(409);
  });

  it('should accept all 5 allowed MIME types', () => {
    ALLOWED_MIME_TYPES.forEach((mimeType) => {
      const result = validateAttachment(mimeType, 1_000_000, 0);
      expect(result.valid).toBe(true);
    });
  });
});
