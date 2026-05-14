import { CATEGORIES } from '@/lib/constants';

export interface DraftSaveInput {
  title?: string | null;
  description?: string | null;
  category?: string | null;
}

export interface DraftValidationResult {
  valid: boolean;
  errors: {
    title?: string;
    description?: string;
    category?: string;
  };
}

const VALID_CATEGORIES = CATEGORIES.map((c) => c.slug);

export function validateDraftSave(input: DraftSaveInput): DraftValidationResult {
  const errors: DraftValidationResult['errors'] = {};

  if (input.title && input.title.trim().length > 200) {
    errors.title = 'Title must be 200 characters or fewer';
  }

  if (input.description && input.description.trim().length > 2000) {
    errors.description = 'Description must be 2000 characters or fewer';
  }

  if (input.category != null && input.category !== '' && !VALID_CATEGORIES.includes(input.category as never)) {
    errors.category = 'Please select a valid category';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
