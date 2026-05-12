import { describe, it, expect } from '@jest/globals';
import { transition } from '@/lib/ideas/statusMachine';

describe('statusMachine.transition', () => {
  it('allows submitted → under_review', () => {
    expect(() => transition('submitted', 'under_review')).not.toThrow();
  });

  it('allows under_review → accepted', () => {
    expect(() => transition('under_review', 'accepted')).not.toThrow();
  });

  it('allows under_review → rejected', () => {
    expect(() => transition('under_review', 'rejected')).not.toThrow();
  });

  it('disallows submitted → accepted', () => {
    expect(() => transition('submitted', 'accepted')).toThrow();
  });

  it('disallows submitted → rejected', () => {
    expect(() => transition('submitted', 'rejected')).toThrow();
  });

  it('disallows accepted → rejected', () => {
    expect(() => transition('accepted', 'rejected')).toThrow();
  });

  it('disallows rejected → accepted', () => {
    expect(() => transition('rejected', 'accepted')).toThrow();
  });
});
