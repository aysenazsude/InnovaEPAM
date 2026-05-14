/** Magic-byte signatures for all accepted file types (Phase 3). */
const SIGNATURES: ReadonlyArray<{
  mime: string;
  offset: number;
  bytes: readonly number[];
}> = [
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'application/zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK\x03\x04 (DOCX/PPTX)
  {
    mime: 'application/msword',
    offset: 0,
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE compound document
  },
  {
    mime: 'image/png',
    offset: 0,
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: 'video/mp4-or-mov', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // 'ftyp' box
];

const ZIP_DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ZIP_PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * Detects the MIME type of a file buffer by inspecting its magic bytes.
 * Returns the canonical MIME string or null if the buffer is unrecognized.
 *
 * Extension is used only to disambiguate formats that share the same magic
 * bytes (DOCX vs PPTX; MP4 vs MOV).
 */
export function detectMimeType(buffer: Buffer, fileExtension: string): string | null {
  const ext = fileExtension.toLowerCase();

  for (const sig of SIGNATURES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;
    const slice = buffer.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (!sig.bytes.every((b, i) => slice[i] === b)) continue;

    if (sig.mime === 'application/zip') {
      return ext === '.pptx' ? ZIP_PPTX_MIME : ZIP_DOCX_MIME;
    }

    if (sig.mime === 'video/mp4-or-mov') {
      return ext === '.mov' ? 'video/quicktime' : 'video/mp4';
    }

    return sig.mime;
  }

  return null;
}
