import { randomUUID } from 'crypto';
import type { NewStageTransition, NewClarificationRequest } from '@/lib/db/schema';

// ── StageTransitionView fixture ────────────────────────────────────────────────

export interface StageTransitionView {
  id: string;
  stage: string;
  action: string;
  notes: string;
  adminDisplayName: string;
  adminId: string;
  createdAt: number;
}

export function createStageTransitionView(
  overrides: Partial<StageTransitionView> = {}
): StageTransitionView {
  return {
    id: randomUUID(),
    stage: 'screening',
    action: 'advanced',
    notes: 'Looks promising',
    adminDisplayName: 'Test Admin',
    adminId: randomUUID(),
    createdAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

// ── NewStageTransition fixture ─────────────────────────────────────────────────

export function createStageTransition(
  ideaId: string,
  adminId: string,
  overrides: Partial<NewStageTransition> = {}
): NewStageTransition {
  return {
    id: randomUUID(),
    ideaId,
    adminId,
    stage: 'screening',
    action: 'advanced',
    notes: 'Screening notes',
    createdAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

// ── NewClarificationRequest fixture ───────────────────────────────────────────

export function createClarificationRequest(
  ideaId: string,
  adminId: string,
  overrides: Partial<NewClarificationRequest> = {}
): NewClarificationRequest {
  return {
    id: randomUUID(),
    ideaId,
    stageWhenRequested: 'screening',
    question: 'Can you provide more details about the technical implementation?',
    questionerId: adminId,
    requestedAt: Math.floor(Date.now() / 1000),
    response: null,
    responderId: null,
    respondedAt: null,
    cancelledAt: null,
    cancelledById: null,
    ...overrides,
  };
}
