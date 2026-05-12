import type { Idea, IdeaStatus } from '@/lib/db/schema';

let ideaCounter = 1;

function makeTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function createIdea(
  status: IdeaStatus = 'submitted',
  overrides: Partial<Idea> = {}
): Idea {
  const n = ideaCounter++;
  return {
    id: overrides.id ?? `IDEA-${String(n).padStart(4, '0')}`,
    numericId: overrides.numericId ?? n,
    title: overrides.title ?? `Test Idea ${n}`,
    description: overrides.description ?? `Description for test idea ${n}. Detailed enough to be valid.`,
    category: overrides.category ?? 'technical_innovation',
    status,
    submitterId: overrides.submitterId ?? `user-submitter-${n}`,
    submittedAt: overrides.submittedAt ?? makeTimestamp(),
    adminComment: overrides.adminComment ?? null,
    evaluatingAdminId: overrides.evaluatingAdminId ?? null,
    evaluatedAt: overrides.evaluatedAt ?? null,
    ...overrides,
  };
}
