import { ideas, stageTransitions, clarificationRequests } from '@/lib/db/schema';
import type { PipelineStage } from '@/lib/db/schema';
import type { TestDB } from './authHelpers';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Ordered pipeline stages for advancing through them
const STAGE_ORDER: PipelineStage[] = [
  'screening',
  'technical_review',
  'business_review',
  'final_decision',
];

/**
 * Advances an idea from 'submitted' (or current stage) to the specified target stage
 * by inserting the required stage_transitions rows and updating ideas.status.
 * Only advances forward; does not validate preconditions.
 */
export async function advanceIdeaToStage(
  db: TestDB,
  ideaId: string,
  adminId: string,
  targetStage: PipelineStage
): Promise<void> {
  const [idea] = await db.select().from(ideas).where(eq(ideas.id, ideaId));
  if (!idea) throw new Error(`Idea ${ideaId} not found`);

  const currentStatus = idea.status;
  const startIndex =
    currentStatus === 'submitted'
      ? 0
      : STAGE_ORDER.indexOf(currentStatus as PipelineStage);

  const targetIndex = STAGE_ORDER.indexOf(targetStage);
  if (targetIndex < 0) throw new Error(`Unknown target stage: ${targetStage}`);

  const stagesToTraverse = STAGE_ORDER.slice(startIndex, targetIndex + 1);

  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < stagesToTraverse.length; i++) {
    const stage = stagesToTraverse[i];
    const isLast = i === stagesToTraverse.length - 1;
    await db.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      adminId,
      stage,
      action: isLast && i < stagesToTraverse.length - 1 ? 'advanced' : 'advanced',
      notes: `Test notes for ${stage}`,
      createdAt: now + i,
    });
  }

  // Update idea status to target stage
  await db.update(ideas).set({ status: targetStage }).where(eq(ideas.id, ideaId));
}

/**
 * Creates an open clarification request for the given idea and sets
 * ideas.status to 'awaiting_clarification'.
 * Returns the newly created clarification request id.
 */
export async function createPendingClarification(
  db: TestDB,
  ideaId: string,
  adminId: string,
  stageWhenRequested: PipelineStage = 'screening'
): Promise<string> {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(clarificationRequests).values({
    id,
    ideaId,
    stageWhenRequested,
    question: 'Please provide more technical details.',
    questionerId: adminId,
    requestedAt: now,
    response: null,
    responderId: null,
    respondedAt: null,
    cancelledAt: null,
    cancelledById: null,
  });

  await db
    .update(ideas)
    .set({ status: 'awaiting_clarification', activeClarificationId: id })
    .where(eq(ideas.id, ideaId));

  return id;
}
