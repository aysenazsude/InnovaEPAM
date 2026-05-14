import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT, MAX_ATTACHMENTS_PER_IDEA, MAX_TOTAL_ATTACHMENT_SIZE } from '@/lib/constants';

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

// ---------------------------------------------------------------------------
// Multi-file validation (Phase 3)
// ---------------------------------------------------------------------------

export interface AttachmentFileInput {
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface MultiAttachmentValidationResult {
  valid: boolean;
  /** Per-file errors keyed by file name */
  fileErrors: Record<string, string>;
  /** Submission-level errors (total size, count) */
  formErrors: Record<string, string>;
}

/**
 * Validates a batch of attachment inputs for a single idea submission.
 * Checks: count limit, per-file type, per-file size, duplicate names, total size.
 * Zero files is valid (attachment is optional).
 */
export function validateAttachments(
  files: AttachmentFileInput[]
): MultiAttachmentValidationResult {
  const fileErrors: Record<string, string> = {};
  const formErrors: Record<string, string> = {};

  // Count check
  if (files.length > MAX_ATTACHMENTS_PER_IDEA) {
    formErrors['files'] = `You can attach at most ${MAX_ATTACHMENTS_PER_IDEA} files per idea`;
  }

  // Per-file checks
  const seenNames = new Set<string>();
  let totalSize = 0;

  for (const f of files) {
    // Always accumulate size so the total-size check is independent of per-file errors
    totalSize += f.sizeBytes;

    // Duplicate name
    if (seenNames.has(f.name)) {
      fileErrors[f.name] = 'Duplicate file name — each attached file must have a unique name';
      continue;
    }
    seenNames.add(f.name);

    // MIME type
    const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES;
    if (!allowedTypes.includes(f.mimeType)) {
      fileErrors[f.name] =
        'File type not allowed. Accepted types: PDF, DOC, DOCX, PPTX, PNG, JPEG, MP4, MOV';
      continue; // skip size check for this file to avoid double-error
    }

    // Per-file size
    if (f.sizeBytes > FILE_SIZE_LIMIT) {
      fileErrors[f.name] = 'File must be 10 MB or smaller';
    }
  }

  // Total size check (only count files that passed per-file checks)
  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
    formErrors['totalSize'] =
      'Total combined size of all attachments must be 30 MB or less';
  }

  const valid = Object.keys(fileErrors).length === 0 && Object.keys(formErrors).length === 0;
  return { valid, fileErrors, formErrors };
}
