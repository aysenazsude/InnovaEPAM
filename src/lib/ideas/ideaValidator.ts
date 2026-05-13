import { CATEGORIES, CategorySlug } from '@/lib/constants';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';

const VALID_CATEGORY_SLUGS = new Set<CategorySlug>(CATEGORIES.map((c) => c.slug));

export interface IdeaValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateIdea(input: {
  title: string;
  description: string;
  category: string;
  categoryFields?: Record<string, string>;
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

  const isValidCategory = VALID_CATEGORY_SLUGS.has(input.category as CategorySlug);
  if (!input.category || !isValidCategory) {
    errors.category = 'Please select a valid category';
  }

  // Validate category-specific fields when provided
  if (input.categoryFields && isValidCategory) {
    const fieldDefs = CATEGORY_FIELDS[input.category as CategorySlug];
    for (const fieldDef of fieldDefs) {
      const value = input.categoryFields[fieldDef.name];
      if (value === undefined || value === null) continue;

      if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
        const limitLabel = fieldDef.type === 'textarea' ? '500' : '100';
        errors[fieldDef.name] = `${fieldDef.label} must be ${limitLabel} characters or fewer`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
