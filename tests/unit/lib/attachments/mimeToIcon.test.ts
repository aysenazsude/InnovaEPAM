import { describe, it, expect } from '@jest/globals';
import { getPreviewKind } from '@/lib/attachments/mimeToIcon';

describe('getPreviewKind', () => {
  describe('image types', () => {
    it('returns "image" for image/png', () => {
      expect(getPreviewKind('image/png')).toBe('image');
    });

    it('returns "image" for image/jpeg', () => {
      expect(getPreviewKind('image/jpeg')).toBe('image');
    });
  });

  describe('video types', () => {
    it('returns "video" for video/mp4', () => {
      expect(getPreviewKind('video/mp4')).toBe('video');
    });

    it('returns "video" for video/quicktime (MOV)', () => {
      expect(getPreviewKind('video/quicktime')).toBe('video');
    });
  });

  describe('document types', () => {
    it('returns "document" for application/pdf', () => {
      expect(getPreviewKind('application/pdf')).toBe('document');
    });

    it('returns "document" for application/msword (DOC)', () => {
      expect(getPreviewKind('application/msword')).toBe('document');
    });

    it('returns "document" for DOCX MIME', () => {
      expect(
        getPreviewKind(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe('document');
    });

    it('returns "document" for PPTX MIME', () => {
      expect(
        getPreviewKind(
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
      ).toBe('document');
    });
  });

  describe('unknown / fallback', () => {
    it('returns "document" for an unknown MIME type', () => {
      expect(getPreviewKind('application/octet-stream')).toBe('document');
    });

    it('returns "document" for empty string', () => {
      expect(getPreviewKind('')).toBe('document');
    });
  });
});
