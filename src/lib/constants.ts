export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'video/mp4',
  'video/quicktime',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const FILE_SIZE_LIMIT = 10_485_760; // 10 MB in bytes

export const MAX_ATTACHMENTS_PER_IDEA = 3;
export const MAX_TOTAL_ATTACHMENT_SIZE = 31_457_280; // 30 MB in bytes (3 × 10 MB)

export const CATEGORIES = [
  { slug: 'technical_innovation', displayName: 'Technical Innovation' },
  { slug: 'process_improvement', displayName: 'Process Improvement' },
  { slug: 'client_solution', displayName: 'Client Solution' },
  { slug: 'product_enhancement', displayName: 'Product Enhancement' },
  { slug: 'other', displayName: 'Other' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const PASSWORD_MIN_LENGTH = 8;

export const SESSION_MAX_AGE_SECONDS = 28_800; // 8 hours

export const LOCKOUT_ATTEMPTS = 5;

export const LOCKOUT_DURATION_SECONDS = 900; // 15 minutes
