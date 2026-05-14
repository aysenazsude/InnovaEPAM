import type { IdeaStatus, PipelineStage } from '@/lib/db/schema';

export type { PipelineStage };

// ── Stage order ───────────────────────────────────────────────────────────────

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  'screening',
  'technical_review',
  'business_review',
  'final_decision',
] as const;

// ── Transition map: what stage comes after each stage (null = terminal) ───────

export const PIPELINE_TRANSITIONS: Record<PipelineStage, PipelineStage | null> = {
  screening: 'technical_review',
  technical_review: 'business_review',
  business_review: 'final_decision',
  final_decision: null,
};

// ── Valid action/transition table ─────────────────────────────────────────────

// From status → allowed next statuses
const VALID_TRANSITIONS: Partial<Record<IdeaStatus, IdeaStatus[]>> = {
  submitted: ['screening'],
  screening: ['technical_review', 'rejected', 'awaiting_clarification'],
  technical_review: ['business_review', 'rejected', 'awaiting_clarification'],
  business_review: ['final_decision', 'rejected', 'awaiting_clarification'],
  final_decision: ['approved', 'rejected', 'awaiting_clarification'],
  awaiting_clarification: [
    'screening', 'technical_review', 'business_review', 'final_decision',
  ],
};

/**
 * Validates a pipeline status transition. Throws if the transition is not allowed.
 */
export function pipelineTransition(current: IdeaStatus, next: IdeaStatus): void {
  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`Invalid pipeline transition: ${current} → ${next}`);
  }
}

/**
 * Returns the next stage after the given pipeline stage, or null if at final_decision.
 */
export function getNextStage(stage: PipelineStage): PipelineStage | null {
  return PIPELINE_TRANSITIONS[stage];
}

/**
 * Returns true if the given status is a Phase 5 pipeline status.
 */
export function isPipelineStatus(status: IdeaStatus): boolean {
  return (
    status === 'screening' ||
    status === 'technical_review' ||
    status === 'business_review' ||
    status === 'final_decision' ||
    status === 'approved' ||
    status === 'awaiting_clarification'
  );
}

/**
 * Returns true if the given status is an active (non-terminal) pipeline stage.
 */
export function isActivePipelineStage(status: IdeaStatus): status is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(status);
}
