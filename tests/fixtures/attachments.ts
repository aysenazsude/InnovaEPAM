import type { Attachment } from '@/lib/db/schema';

let attachmentCounter = 1;

function makeTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function createAttachment(
  mimeType = 'application/pdf',
  sizeBytes = 1_048_576, // 1 MB default
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
    uploadedAt: overrides.uploadedAt ?? makeTimestamp(),
    ...overrides,
  };
}
