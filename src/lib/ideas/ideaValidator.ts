import { CATEGORIES, CategorySlug } from '@/lib/constants';

const VALID_CATEGORY_SLUGS = new Set<CategorySlug>(CATEGORIES.map((c) => c.slug));

export interface IdeaValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateIdea(input: {
  title: string;
  description: string;
  category: string;
}): IdeaValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (input.title.trim().length > 100) {
    errors.title = 'Title must be 100 characters or fewer';
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (input.description.trim().length > 2000) {
    errors.description = 'Description must be 2000 characters or fewer';
  }

  if (!input.category || !VALID_CATEGORY_SLUGS.has(input.category as CategorySlug)) {
    errors.category = 'Please select a valid category';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
