import { randomUUID } from 'node:crypto';
import type { NewEvaluationScore } from '@/lib/db/schema';

let counter = 0;

export function makeEvaluationScore(
  overrides: Partial<NewEvaluationScore> & {
    id?: string;
    ideaId?: string;
    stageTransitionId?: string;
    adminId?: string;
  } = {}
): NewEvaluationScore {
  counter += 1;
  return {
    id: randomUUID(),
    ideaId: `idea-${counter}`,
    stageTransitionId: `transition-${counter}`,
    adminId: `admin-${counter}`,
    dimension: 'innovation',
    score: 3,
    createdAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}
