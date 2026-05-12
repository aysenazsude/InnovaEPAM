import { IdeaStatus } from '@/lib/db/schema';

export type { IdeaStatus };

const VALID_TRANSITIONS: Partial<Record<IdeaStatus, IdeaStatus[]>> = {
  submitted: ['under_review'],
  under_review: ['accepted', 'rejected'],
};

export const VALID_EVAL_STATUSES: IdeaStatus[] = ['under_review', 'accepted', 'rejected'];

export function transition(current: IdeaStatus, next: IdeaStatus): void {
  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid status transition: ${current} → ${next}`
    );
  }
}
