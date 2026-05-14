import { describe, it, expect } from '@jest/globals';
import { detectMimeType } from '@/lib/attachments/mimeDetector';

// Minimal magic-byte buffers for each accepted type
function pdfBuffer(): Buffer {
  return Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]); // %PDF-1
}

function zipBuffer(): Buffer {
  return Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]); // PK\x03\x04
}

function docBuffer(): Buffer {
  return Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

function pngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function jpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
}

/**
 * MP4/MOV: 4-byte size, then 'ftyp' at offset 4.
 * Bytes: [size(4)] [0x66 0x74 0x79 0x70] = ftyp
 */
function ftypBuffer(ext: '.mp4' | '.mov'): Buffer {
  const buf = Buffer.alloc(16, 0);
  buf.writeUInt32BE(16, 0); // box size
  buf.write('ftyp', 4, 'ascii');
  // brand can vary — not relevant for detection
  buf.write(ext === '.mp4' ? 'isom' : 'qt  ', 8, 'ascii');
  return buf;
}

function unknownBuffer(): Buffer {
  return Buffer.from([0x00, 0x01, 0x02, 0x03]);
}

describe('detectMimeType', () => {
  describe('PDF', () => {
    it('returns application/pdf for %PDF magic bytes', () => {
      expect(detectMimeType(pdfBuffer(), '.pdf')).toBe('application/pdf');
    });
  });

  describe('DOCX', () => {
    it('returns DOCX MIME for ZIP magic bytes with .docx extension', () => {
      expect(detectMimeType(zipBuffer(), '.docx')).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('defaults ZIP magic bytes without .pptx extension to DOCX MIME', () => {
      const result = detectMimeType(zipBuffer(), '.other');
      expect(result).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });
  });

  describe('PPTX', () => {
    it('returns PPTX MIME for ZIP magic bytes with .pptx extension', () => {
      expect(detectMimeType(zipBuffer(), '.pptx')).toBe(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
    });
  });

  describe('DOC (OLE)', () => {
    it('returns application/msword for OLE compound document header', () => {
      expect(detectMimeType(docBuffer(), '.doc')).toBe('application/msword');
    });
  });

  describe('PNG', () => {
    it('returns image/png for PNG magic bytes', () => {
      expect(detectMimeType(pngBuffer(), '.png')).toBe('image/png');
    });
  });

  describe('JPEG', () => {
    it('returns image/jpeg for JPEG magic bytes', () => {
      expect(detectMimeType(jpegBuffer(), '.jpg')).toBe('image/jpeg');
    });

    it('returns image/jpeg for JPEG with .jpeg extension', () => {
      expect(detectMimeType(jpegBuffer(), '.jpeg')).toBe('image/jpeg');
    });
  });

  describe('MP4', () => {
    it('returns video/mp4 for ftyp box with .mp4 extension', () => {
      expect(detectMimeType(ftypBuffer('.mp4'), '.mp4')).toBe('video/mp4');
    });
  });

  describe('MOV', () => {
    it('returns video/quicktime for ftyp box with .mov extension', () => {
      expect(detectMimeType(ftypBuffer('.mov'), '.mov')).toBe('video/quicktime');
    });
  });

  describe('Unrecognized bytes', () => {
    it('returns null for unknown magic bytes', () => {
      expect(detectMimeType(unknownBuffer(), '.bin')).toBeNull();
    });

    it('returns null for empty buffer', () => {
      expect(detectMimeType(Buffer.alloc(0), '.pdf')).toBeNull();
    });

    it('returns null for buffer too short to match any signature', () => {
      expect(detectMimeType(Buffer.from([0x25]), '.pdf')).toBeNull();
    });
  });

  describe('Case insensitivity on extension', () => {
    it('returns PPTX MIME for uppercase .PPTX extension', () => {
      expect(detectMimeType(zipBuffer(), '.PPTX')).toBe(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
    });

    it('returns video/quicktime for uppercase .MOV extension', () => {
      expect(detectMimeType(ftypBuffer('.mov'), '.MOV')).toBe('video/quicktime');
    });
  });
});
