import type { Attachment } from '@/lib/db/schema';

let attachmentCounter = 1;

function makeTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function createAttachment(
  mimeType = 'application/pdf',
  sizeBytes = 1_048_576, // 1 MB default
  orderIndex = 0,
  overrides: Partial<Attachment> = {}
): Attachment {
  const n = attachmentCounter++;
  return {
    id: overrides.id ?? `attachment-${n}`,
    ideaId: overrides.ideaId ?? `IDEA-${String(n).padStart(4, '0')}`,
    fileName: overrides.fileName ?? `test-document-${n}.pdf`,
    fileType: mimeType,
    fileSize: sizeBytes,
    storagePath: overrides.storagePath ?? `${n}-abcdef.pdf`,
    uploadOrderIndex: overrides.uploadOrderIndex ?? orderIndex,
    uploadedAt: overrides.uploadedAt ?? makeTimestamp(),
    ...overrides,
  };
}

/**
 * Returns a minimal Buffer containing valid magic bytes for the given MIME type.
 * Used in unit and integration tests to simulate real file contents without
 * reading actual files from disk.
 */
export function makeBuffer(mimeType: string): Buffer {
  switch (mimeType) {
    case 'application/pdf':
      // %PDF-1
      return Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      // ZIP PK magic (both DOCX and PPTX share this header)
      return Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

    case 'application/msword':
      // OLE compound document header
      return Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

    case 'image/png':
      return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    case 'image/jpeg':
      return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    case 'video/mp4':
    case 'video/quicktime': {
      // ftyp box: [size(4)] [ftyp(4)] [brand(4)] [version(4)]
      const buf = Buffer.alloc(16, 0);
      buf.writeUInt32BE(16, 0);
      buf.write('ftyp', 4, 'ascii');
      buf.write(mimeType === 'video/mp4' ? 'isom' : 'qt  ', 8, 'ascii');
      return buf;
    }

    default:
      // Unknown — 4 zero bytes that won't match any signature
      return Buffer.alloc(4, 0x00);
  }
}

