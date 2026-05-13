import { describe, it, expect } from '@jest/globals';
import { validateIdea } from '@/lib/ideas/ideaValidator';
import { CATEGORIES } from '@/lib/constants';
import { CategorySlug } from '@/lib/constants';

describe('ideaValidator', () => {
  const validInput = {
    title: 'My Great Idea',
    description: 'A detailed description that explains the innovation clearly.',
    category: 'technical_innovation',
  };

  it('should return valid for a fully valid input', () => {
    const result = validateIdea(validInput);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should reject when title is missing', () => {
    const result = validateIdea({ ...validInput, title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeDefined();
  });

  it('should reject when title exceeds 100 characters', () => {
    const result = validateIdea({ ...validInput, title: 'A'.repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeDefined();
  });

  it('should accept a title of exactly 100 characters', () => {
    const result = validateIdea({ ...validInput, title: 'A'.repeat(100) });
    expect(result.valid).toBe(true);
  });

  it('should reject when description is missing', () => {
    const result = validateIdea({ ...validInput, description: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it('should reject when description exceeds 2000 characters', () => {
    const result = validateIdea({ ...validInput, description: 'A'.repeat(2001) });
    expect(result.valid).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it('should accept a description of exactly 2000 characters', () => {
    const result = validateIdea({ ...validInput, description: 'A'.repeat(2000) });
    expect(result.valid).toBe(true);
  });

  it('should reject an invalid category slug', () => {
    const result = validateIdea({ ...validInput, category: 'invalid_slug' });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it('should accept all 5 valid category slugs', () => {
    CATEGORIES.forEach(({ slug }) => {
      const result = validateIdea({ ...validInput, category: slug });
      expect(result.valid).toBe(true);
    });
  });

  it('should return separate errors for each invalid field', () => {
    const result = validateIdea({ title: '', description: '', category: 'bad' });
    expect(result.errors.title).toBeDefined();
    expect(result.errors.description).toBeDefined();
    expect(result.errors.category).toBeDefined();
  });
});

describe('ideaValidator — category fields', () => {
  const baseInput = {
    title: 'Valid Title',
    description: 'Valid description that is long enough.',
    category: 'process_improvement' as CategorySlug,
  };

  it('should pass when optional category fields are omitted entirely', () => {
    const result = validateIdea(baseInput);
    expect(result.valid).toBe(true);
  });

  it('should pass when all category fields are within limits', () => {
    const result = validateIdea({
      ...baseInput,
      categoryFields: {
        affected_team: 'Platform Engineering',
        current_pain_point: 'Slow release cycles.',
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should reject when a text field exceeds 100 characters', () => {
    const result = validateIdea({
      ...baseInput,
      categoryFields: {
        affected_team: 'A'.repeat(101),
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors['affected_team']).toBeDefined();
  });

  it('should pass when a text field is exactly 100 characters', () => {
    const result = validateIdea({
      ...baseInput,
      categoryFields: {
        affected_team: 'A'.repeat(100),
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should reject when a textarea field exceeds 500 characters', () => {
    const result = validateIdea({
      ...baseInput,
      categoryFields: {
        current_pain_point: 'B'.repeat(501),
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors['current_pain_point']).toBeDefined();
  });

  it('should pass when a textarea field is exactly 500 characters', () => {
    const result = validateIdea({
      ...baseInput,
      categoryFields: {
        current_pain_point: 'B'.repeat(500),
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should silently ignore unknown category field keys', () => {
    const result = validateIdea({
      ...baseInput,
      categoryFields: {
        unknown_field_xyz: 'A'.repeat(200),
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors['unknown_field_xyz']).toBeUndefined();
  });

  it('should pass with empty category fields for "other" category', () => {
    const result = validateIdea({
      title: 'Valid Title',
      description: 'Valid description.',
      category: 'other' as CategorySlug,
      categoryFields: {},
    });
    expect(result.valid).toBe(true);
  });

  it('should return errors for multiple invalid category fields simultaneously', () => {
    const result = validateIdea({
      ...baseInput,
      categoryFields: {
        affected_team: 'A'.repeat(101),
        current_pain_point: 'B'.repeat(501),
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors['affected_team']).toBeDefined();
    expect(result.errors['current_pain_point']).toBeDefined();
  });
});
