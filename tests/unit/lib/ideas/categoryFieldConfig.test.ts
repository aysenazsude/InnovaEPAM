import { describe, it, expect } from '@jest/globals';
import { CATEGORY_FIELDS, FieldDefinition } from '@/lib/ideas/categoryFieldConfig';
import { CATEGORIES, CategorySlug } from '@/lib/constants';

describe('categoryFieldConfig', () => {
  describe('CATEGORY_FIELDS', () => {
    it('should have an entry for every defined category slug', () => {
      CATEGORIES.forEach(({ slug }) => {
        expect(CATEGORY_FIELDS).toHaveProperty(slug);
      });
    });

    it('should return 2 fields for technical_innovation', () => {
      const fields = CATEGORY_FIELDS['technical_innovation'];
      expect(fields).toHaveLength(2);
    });

    it('should return technology_area as a select field with correct options', () => {
      const field = CATEGORY_FIELDS['technical_innovation'].find((f) => f.name === 'technology_area');
      expect(field).toBeDefined();
      expect(field!.type).toBe('select');
      expect(field!.options).toContain('Frontend');
      expect(field!.options).toContain('Backend');
      expect(field!.options).toContain('Infrastructure');
      expect(field!.options).toContain('Data / AI');
      expect(field!.options).toContain('Security');
      expect(field!.options).toContain('Other');
    });

    it('should return estimated_effort as a select field with correct options', () => {
      const field = CATEGORY_FIELDS['technical_innovation'].find((f) => f.name === 'estimated_effort');
      expect(field).toBeDefined();
      expect(field!.type).toBe('select');
      expect(field!.options).toContain('Days');
      expect(field!.options).toContain('Weeks');
      expect(field!.options).toContain('Months');
    });

    it('should return 2 fields for process_improvement', () => {
      const fields = CATEGORY_FIELDS['process_improvement'];
      expect(fields).toHaveLength(2);
    });

    it('should return affected_team as a text field with maxLength 100', () => {
      const field = CATEGORY_FIELDS['process_improvement'].find((f) => f.name === 'affected_team');
      expect(field).toBeDefined();
      expect(field!.type).toBe('text');
      expect(field!.maxLength).toBe(100);
    });

    it('should return current_pain_point as a textarea field with maxLength 500', () => {
      const field = CATEGORY_FIELDS['process_improvement'].find((f) => f.name === 'current_pain_point');
      expect(field).toBeDefined();
      expect(field!.type).toBe('textarea');
      expect(field!.maxLength).toBe(500);
    });

    it('should return 2 fields for client_solution', () => {
      expect(CATEGORY_FIELDS['client_solution']).toHaveLength(2);
    });

    it('should return target_client_segment as a text field with maxLength 100', () => {
      const field = CATEGORY_FIELDS['client_solution'].find((f) => f.name === 'target_client_segment');
      expect(field).toBeDefined();
      expect(field!.type).toBe('text');
      expect(field!.maxLength).toBe(100);
    });

    it('should return client_problem_statement as a textarea field with maxLength 500', () => {
      const field = CATEGORY_FIELDS['client_solution'].find((f) => f.name === 'client_problem_statement');
      expect(field).toBeDefined();
      expect(field!.type).toBe('textarea');
      expect(field!.maxLength).toBe(500);
    });

    it('should return 2 fields for product_enhancement', () => {
      expect(CATEGORY_FIELDS['product_enhancement']).toHaveLength(2);
    });

    it('should return affected_product as a text field with maxLength 100', () => {
      const field = CATEGORY_FIELDS['product_enhancement'].find((f) => f.name === 'affected_product');
      expect(field).toBeDefined();
      expect(field!.type).toBe('text');
      expect(field!.maxLength).toBe(100);
    });

    it('should return proposed_user_benefit as a textarea field with maxLength 500', () => {
      const field = CATEGORY_FIELDS['product_enhancement'].find((f) => f.name === 'proposed_user_benefit');
      expect(field).toBeDefined();
      expect(field!.type).toBe('textarea');
      expect(field!.maxLength).toBe(500);
    });

    it('should return an empty array for other', () => {
      expect(CATEGORY_FIELDS['other']).toEqual([]);
    });

    it('should have a label on every field definition', () => {
      (Object.values(CATEGORY_FIELDS) as FieldDefinition[][]).forEach((fields) => {
        fields.forEach((f) => {
          expect(typeof f.label).toBe('string');
          expect(f.label.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
