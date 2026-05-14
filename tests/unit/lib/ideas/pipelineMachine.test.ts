import { describe, it, expect } from '@jest/globals';
import {
  pipelineTransition,
  getNextStage,
  isPipelineStatus,
  isActivePipelineStage,
  PIPELINE_STAGES,
} from '@/lib/ideas/pipelineMachine';

describe('pipelineMachine', () => {
  describe('pipelineTransition — valid transitions', () => {
    it('should allow submitted → screening', () => {
      expect(() => pipelineTransition('submitted', 'screening')).not.toThrow();
    });

    it('should allow screening → technical_review', () => {
      expect(() => pipelineTransition('screening', 'technical_review')).not.toThrow();
    });

    it('should allow technical_review → business_review', () => {
      expect(() => pipelineTransition('technical_review', 'business_review')).not.toThrow();
    });

    it('should allow business_review → final_decision', () => {
      expect(() => pipelineTransition('business_review', 'final_decision')).not.toThrow();
    });

    it('should allow final_decision → approved', () => {
      expect(() => pipelineTransition('final_decision', 'approved')).not.toThrow();
    });

    it('should allow screening → rejected', () => {
      expect(() => pipelineTransition('screening', 'rejected')).not.toThrow();
    });

    it('should allow business_review → rejected', () => {
      expect(() => pipelineTransition('business_review', 'rejected')).not.toThrow();
    });

    it('should allow final_decision → rejected', () => {
      expect(() => pipelineTransition('final_decision', 'rejected')).not.toThrow();
    });

    it('should allow screening → awaiting_clarification', () => {
      expect(() => pipelineTransition('screening', 'awaiting_clarification')).not.toThrow();
    });

    it('should allow awaiting_clarification → screening (resume)', () => {
      expect(() => pipelineTransition('awaiting_clarification', 'screening')).not.toThrow();
    });

    it('should allow awaiting_clarification → technical_review (resume)', () => {
      expect(() => pipelineTransition('awaiting_clarification', 'technical_review')).not.toThrow();
    });
  });

  describe('pipelineTransition — invalid transitions', () => {
    it('should throw when skipping from submitted → technical_review', () => {
      expect(() => pipelineTransition('submitted', 'technical_review')).toThrow(
        'Invalid pipeline transition'
      );
    });

    it('should throw when going backward from final_decision → screening', () => {
      expect(() => pipelineTransition('final_decision', 'screening')).toThrow(
        'Invalid pipeline transition'
      );
    });

    it('should throw when going from approved to any stage', () => {
      expect(() => pipelineTransition('approved', 'screening')).toThrow(
        'Invalid pipeline transition'
      );
    });

    it('should throw when going from rejected to any stage', () => {
      expect(() => pipelineTransition('rejected', 'screening')).toThrow(
        'Invalid pipeline transition'
      );
    });

    it('should throw when going from screening → business_review (skipping a stage)', () => {
      expect(() => pipelineTransition('screening', 'business_review')).toThrow(
        'Invalid pipeline transition'
      );
    });
  });

  describe('getNextStage', () => {
    it('should return technical_review after screening', () => {
      expect(getNextStage('screening')).toBe('technical_review');
    });

    it('should return business_review after technical_review', () => {
      expect(getNextStage('technical_review')).toBe('business_review');
    });

    it('should return final_decision after business_review', () => {
      expect(getNextStage('business_review')).toBe('final_decision');
    });

    it('should return null at final_decision', () => {
      expect(getNextStage('final_decision')).toBeNull();
    });
  });

  describe('isPipelineStatus', () => {
    it('should return true for screening', () => {
      expect(isPipelineStatus('screening')).toBe(true);
    });

    it('should return true for awaiting_clarification', () => {
      expect(isPipelineStatus('awaiting_clarification')).toBe(true);
    });

    it('should return true for approved', () => {
      expect(isPipelineStatus('approved')).toBe(true);
    });

    it('should return false for submitted', () => {
      expect(isPipelineStatus('submitted')).toBe(false);
    });

    it('should return false for under_review', () => {
      expect(isPipelineStatus('under_review')).toBe(false);
    });

    it('should return false for accepted', () => {
      expect(isPipelineStatus('accepted')).toBe(false);
    });

    it('should return false for rejected', () => {
      expect(isPipelineStatus('rejected')).toBe(false);
    });
  });

  describe('isActivePipelineStage', () => {
    it('should return true for all 4 pipeline stages', () => {
      for (const stage of PIPELINE_STAGES) {
        expect(isActivePipelineStage(stage)).toBe(true);
      }
    });

    it('should return false for approved', () => {
      expect(isActivePipelineStage('approved')).toBe(false);
    });

    it('should return false for awaiting_clarification', () => {
      expect(isActivePipelineStage('awaiting_clarification')).toBe(false);
    });
  });
});
