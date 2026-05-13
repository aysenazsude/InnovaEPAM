import { describe, it, expect } from '@jest/globals';
import { CATEGORY_GUIDANCE } from '@/lib/ideas/categoryGuidanceConfig';
import { CATEGORIES } from '@/lib/constants';

describe('categoryGuidanceConfig', () => {
  describe('CATEGORY_GUIDANCE', () => {
    it('should have a guidance string for every defined category slug', () => {
      CATEGORIES.forEach(({ slug }) => {
        expect(CATEGORY_GUIDANCE).toHaveProperty(slug);
        expect(typeof CATEGORY_GUIDANCE[slug]).toBe('string');
        expect(CATEGORY_GUIDANCE[slug].length).toBeGreaterThan(0);
      });
    });

    it('should return the correct guidance for technical_innovation', () => {
      expect(CATEGORY_GUIDANCE['technical_innovation']).toBe(
        'Describe the technical problem this solves, the proposed approach, and the expected measurable improvement.'
      );
    });

    it('should return the correct guidance for process_improvement', () => {
      expect(CATEGORY_GUIDANCE['process_improvement']).toBe(
        'Explain the current inefficiency, who is affected, and how this idea would improve the situation.'
      );
    });

    it('should return the correct guidance for client_solution', () => {
      expect(CATEGORY_GUIDANCE['client_solution']).toBe(
        "Describe the client's challenge clearly and explain how this idea addresses their pain point and the value it delivers."
      );
    });

    it('should return the correct guidance for product_enhancement', () => {
      expect(CATEGORY_GUIDANCE['product_enhancement']).toBe(
        'Describe the current limitation and how this enhancement would improve the user experience or product capability.'
      );
    });

    it('should return the correct guidance for other', () => {
      expect(CATEGORY_GUIDANCE['other']).toBe(
        'Please provide as much detail as possible to help evaluators understand and assess your idea.'
      );
    });
  });
});
