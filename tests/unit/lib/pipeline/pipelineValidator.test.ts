import { describe, it, expect } from '@jest/globals';
import {
  validateNotes,
  validateQuestion,
  validateResponse,
} from '@/lib/pipeline/pipelineValidator';

describe('pipelineValidator', () => {
  describe('validateNotes', () => {
    it('should be invalid when notes is empty', () => {
      const result = validateNotes('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Notes are required');
    });

    it('should be invalid when notes is whitespace only', () => {
      const result = validateNotes('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Notes are required');
    });

    it('should be valid when notes is exactly 1 character', () => {
      const result = validateNotes('A');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should be valid when notes is 2000 characters', () => {
      const result = validateNotes('A'.repeat(2000));
      expect(result.valid).toBe(true);
    });

    it('should be invalid when notes exceeds 2000 characters', () => {
      const result = validateNotes('A'.repeat(2001));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Notes must be 2000 characters or fewer');
    });

    it('should trim before checking length', () => {
      // 2001 chars of spaces should be trimmed to 0 → blank error, not length error
      const result = validateNotes(' '.repeat(2001));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Notes are required');
    });
  });

  describe('validateQuestion', () => {
    it('should be invalid when question is empty', () => {
      const result = validateQuestion('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question is required');
    });

    it('should be invalid when question is whitespace only', () => {
      const result = validateQuestion('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question is required');
    });

    it('should be valid when question is exactly 1 character', () => {
      const result = validateQuestion('?');
      expect(result.valid).toBe(true);
    });

    it('should be valid when question is exactly 1000 characters', () => {
      const result = validateQuestion('Q'.repeat(1000));
      expect(result.valid).toBe(true);
    });

    it('should be invalid when question exceeds 1000 characters', () => {
      const result = validateQuestion('Q'.repeat(1001));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Question must be 1000 characters or fewer');
    });
  });

  describe('validateResponse', () => {
    it('should be invalid when response is empty', () => {
      const result = validateResponse('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Response is required');
    });

    it('should be invalid when response is whitespace only', () => {
      const result = validateResponse('  ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Response is required');
    });

    it('should be valid when response is exactly 1 character', () => {
      const result = validateResponse('A');
      expect(result.valid).toBe(true);
    });

    it('should be valid when response is 2000 characters', () => {
      const result = validateResponse('R'.repeat(2000));
      expect(result.valid).toBe(true);
    });

    it('should be invalid when response exceeds 2000 characters', () => {
      const result = validateResponse('R'.repeat(2001));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Response must be 2000 characters or fewer');
    });
  });
});
