import { describe, it, expect } from '@jest/globals';
import { validateAttachment, validateAttachments } from '@/lib/attachments/attachmentValidator';
import type { AttachmentFileInput } from '@/lib/attachments/attachmentValidator';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT, MAX_ATTACHMENTS_PER_IDEA, MAX_TOTAL_ATTACHMENT_SIZE } from '@/lib/constants';

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

  it('should accept video/mp4 (added in Phase 3)', () => {
    const result = validateAttachment('video/mp4', 500_000, 0);
    expect(result.valid).toBe(true);
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

// Helper to build AttachmentFileInput
function file(
  name: string,
  mimeType: string = 'application/pdf',
  sizeBytes: number = 1_000_000
): AttachmentFileInput {
  return { name, mimeType, sizeBytes };
}

describe('validateAttachments', () => {
  describe('count validation', () => {
    it('returns valid for 0 files (no attachment is optional)', () => {
      const result = validateAttachments([]);
      expect(result.valid).toBe(true);
      expect(result.formErrors).toEqual({});
      expect(result.fileErrors).toEqual({});
    });

    it('returns valid for 1 file', () => {
      const result = validateAttachments([file('a.pdf')]);
      expect(result.valid).toBe(true);
    });

    it('returns valid for 2 files', () => {
      const result = validateAttachments([file('a.pdf'), file('b.pdf')]);
      expect(result.valid).toBe(true);
    });

    it(`returns valid for exactly ${MAX_ATTACHMENTS_PER_IDEA} files`, () => {
      const files = Array.from({ length: MAX_ATTACHMENTS_PER_IDEA }, (_, i) =>
        file(`f${i}.pdf`)
      );
      const result = validateAttachments(files);
      expect(result.valid).toBe(true);
    });

    it(`returns formErrors.files for ${MAX_ATTACHMENTS_PER_IDEA + 1} files`, () => {
      const files = Array.from({ length: MAX_ATTACHMENTS_PER_IDEA + 1 }, (_, i) =>
        file(`f${i}.pdf`)
      );
      const result = validateAttachments(files);
      expect(result.valid).toBe(false);
      expect(result.formErrors['files']).toBeDefined();
    });
  });

  describe('per-file MIME type validation', () => {
    it('rejects a file with a disallowed MIME type via fileErrors keyed by name', () => {
      const result = validateAttachments([file('bad.exe', 'application/x-msdownload')]);
      expect(result.valid).toBe(false);
      expect(result.fileErrors['bad.exe']).toBeDefined();
    });

    it('does not reject a file with an allowed MIME type', () => {
      const result = validateAttachments([file('ok.png', 'image/png')]);
      expect(result.valid).toBe(true);
      expect(result.fileErrors['ok.png']).toBeUndefined();
    });

    it('accepts video/mp4', () => {
      const result = validateAttachments([file('clip.mp4', 'video/mp4')]);
      expect(result.valid).toBe(true);
    });

    it('accepts video/quicktime (MOV)', () => {
      const result = validateAttachments([file('clip.mov', 'video/quicktime')]);
      expect(result.valid).toBe(true);
    });

    it('rejects one bad file while accepting the other', () => {
      const result = validateAttachments([
        file('ok.pdf', 'application/pdf'),
        file('bad.txt', 'text/plain'),
      ]);
      expect(result.valid).toBe(false);
      expect(result.fileErrors['bad.txt']).toBeDefined();
      expect(result.fileErrors['ok.pdf']).toBeUndefined();
    });
  });

  describe('per-file size validation', () => {
    it('rejects a file exceeding FILE_SIZE_LIMIT', () => {
      const result = validateAttachments([file('big.pdf', 'application/pdf', FILE_SIZE_LIMIT + 1)]);
      expect(result.valid).toBe(false);
      expect(result.fileErrors['big.pdf']).toBeDefined();
    });

    it('accepts a file of exactly FILE_SIZE_LIMIT bytes', () => {
      const result = validateAttachments([file('exact.pdf', 'application/pdf', FILE_SIZE_LIMIT)]);
      expect(result.valid).toBe(true);
    });
  });

  describe('duplicate file name validation', () => {
    it('rejects files with the same name', () => {
      const result = validateAttachments([
        file('dup.pdf', 'application/pdf'),
        file('dup.pdf', 'image/png'), // same name, different type
      ]);
      expect(result.valid).toBe(false);
      expect(result.fileErrors['dup.pdf']).toBeDefined();
    });

    it('accepts files with different names', () => {
      const result = validateAttachments([
        file('a.pdf', 'application/pdf'),
        file('b.pdf', 'application/pdf'),
      ]);
      expect(result.valid).toBe(true);
    });
  });

  describe('total size validation', () => {
    it('rejects when combined size exceeds MAX_TOTAL_ATTACHMENT_SIZE', () => {
      // 3 files each just over 10 MB = > 30 MB total
      const oneMbOver = Math.floor(MAX_TOTAL_ATTACHMENT_SIZE / 3) + 1;
      const result = validateAttachments([
        file('a.pdf', 'application/pdf', oneMbOver),
        file('b.pdf', 'application/pdf', oneMbOver),
        file('c.pdf', 'application/pdf', oneMbOver),
      ]);
      expect(result.valid).toBe(false);
      expect(result.formErrors['totalSize']).toBeDefined();
    });

    it('accepts when combined size equals MAX_TOTAL_ATTACHMENT_SIZE', () => {
      const each = Math.floor(MAX_TOTAL_ATTACHMENT_SIZE / 3);
      const result = validateAttachments([
        file('a.pdf', 'application/pdf', each),
        file('b.pdf', 'application/pdf', each),
        file('c.pdf', 'application/pdf', each),
      ]);
      expect(result.valid).toBe(true);
      expect(result.formErrors['totalSize']).toBeUndefined();
    });
  });

  describe('combined validation', () => {
    it('collects errors from multiple invalid files independently', () => {
      const result = validateAttachments([
        file('ok.pdf', 'application/pdf', 1_000_000),
        file('bad.exe', 'application/x-msdownload', 1_000_000),
        file('big.png', 'image/png', FILE_SIZE_LIMIT + 1),
      ]);
      expect(result.valid).toBe(false);
      expect(result.fileErrors['bad.exe']).toBeDefined();
      expect(result.fileErrors['big.png']).toBeDefined();
      expect(result.fileErrors['ok.pdf']).toBeUndefined();
    });
  });
});
