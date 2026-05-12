import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT } from '@/lib/constants';

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

export function validateAttachment(
  mimeType: string,
  sizeBytes: number,
  existingCount: number
): AttachmentValidationResult {
  // One attachment per idea maximum
  if (existingCount >= 1) {
    return {
      valid: false,
      error: 'Only one attachment per idea is allowed',
      statusCode: 409,
    };
  }

  // MIME type check
  const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES;
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type not allowed. Accepted types: PDF, DOC, DOCX, PNG, JPEG`,
      statusCode: 400,
    };
  }

  // Size check
  if (sizeBytes > FILE_SIZE_LIMIT) {
    return {
      valid: false,
      error: `File must be 10 MB or smaller`,
      statusCode: 400,
    };
  }

  return { valid: true };
}
