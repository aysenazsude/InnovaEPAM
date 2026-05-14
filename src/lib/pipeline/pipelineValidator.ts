// ── Validation helpers for pipeline action inputs ─────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Validates stage transition notes. Required; 1–2000 characters.
 */
export function validateNotes(notes: string): ValidationResult {
  if (isBlank(notes)) {
    return { valid: false, error: 'Notes are required' };
  }
  if (notes.trim().length > 2000) {
    return { valid: false, error: 'Notes must be 2000 characters or fewer' };
  }
  return { valid: true };
}

/**
 * Validates a clarification question. Required; 1–1000 characters.
 */
export function validateQuestion(question: string): ValidationResult {
  if (isBlank(question)) {
    return { valid: false, error: 'Question is required' };
  }
  if (question.trim().length > 1000) {
    return { valid: false, error: 'Question must be 1000 characters or fewer' };
  }
  return { valid: true };
}

/**
 * Validates a clarification response from the submitter. Required; 1–2000 characters.
 */
export function validateResponse(response: string): ValidationResult {
  if (isBlank(response)) {
    return { valid: false, error: 'Response is required' };
  }
  if (response.trim().length > 2000) {
    return { valid: false, error: 'Response must be 2000 characters or fewer' };
  }
  return { valid: true };
}
