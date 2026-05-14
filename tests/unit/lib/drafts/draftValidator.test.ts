import { describe, it, expect } from '@jest/globals';
import { validateDraftSave } from '@/lib/drafts/draftValidator';

describe('validateDraftSave', () => {
  it('should return valid for completely empty input', () => {
    const result = validateDraftSave({});
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return valid when only title is provided', () => {
    const result = validateDraftSave({ title: 'My Draft' });
    expect(result.valid).toBe(true);
  });

  it('should return valid when title is empty string (treated as null)', () => {
    const result = validateDraftSave({ title: '' });
    expect(result.valid).toBe(true);
  });

  it('should return error when title exceeds 200 characters', () => {
    const result = validateDraftSave({ title: 'A'.repeat(201) });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toMatch(/200/);
  });

  it('should return valid when title is exactly 200 characters', () => {
    const result = validateDraftSave({ title: 'A'.repeat(200) });
    expect(result.valid).toBe(true);
  });

  it('should return error when description exceeds 2000 characters', () => {
    const result = validateDraftSave({ description: 'D'.repeat(2001) });
    expect(result.valid).toBe(false);
    expect(result.errors.description).toMatch(/2000/);
  });

  it('should return valid when description is exactly 2000 characters', () => {
    const result = validateDraftSave({ description: 'D'.repeat(2000) });
    expect(result.valid).toBe(true);
  });

  it('should return error when category is provided but not a valid slug', () => {
    const result = validateDraftSave({ category: 'not_a_real_category' });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it('should return valid when category is a known slug', () => {
    const result = validateDraftSave({ category: 'technical_innovation' });
    expect(result.valid).toBe(true);
  });

  it('should return valid when category is null (not yet selected)', () => {
    const result = validateDraftSave({ category: null });
    expect(result.valid).toBe(true);
  });

  it('should return valid when all fields are provided and valid', () => {
    const result = validateDraftSave({
      title: 'My Idea Draft',
      description: 'Some description',
      category: 'process_improvement',
    });
    expect(result.valid).toBe(true);
  });

  it('should accumulate multiple errors when multiple fields are invalid', () => {
    const result = validateDraftSave({
      title: 'T'.repeat(201),
      description: 'D'.repeat(2001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeDefined();
    expect(result.errors.description).toBeDefined();
  });
});
