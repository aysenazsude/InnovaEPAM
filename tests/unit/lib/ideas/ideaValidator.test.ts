import { describe, it, expect } from '@jest/globals';
import { validateIdea } from '@/lib/ideas/ideaValidator';
import { CATEGORIES } from '@/lib/constants';

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
