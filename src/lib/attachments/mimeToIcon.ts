export type PreviewKind = 'image' | 'video' | 'document';

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);

/**
 * Maps a MIME type to a preview kind for use in UI rendering decisions.
 * Unknown or document MIMEs fall back to 'document'.
 */
export function getPreviewKind(mimeType: string): PreviewKind {
  if (IMAGE_MIMES.has(mimeType)) return 'image';
  if (VIDEO_MIMES.has(mimeType)) return 'video';
  return 'document';
}
