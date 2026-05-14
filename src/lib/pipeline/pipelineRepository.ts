import { eq, asc, inArray, sql } from 'drizzle-orm';
import type { DB } from '@/lib/db';
import {
  stageTransitions,
  clarificationRequests,
  users,
  ideas,
  type NewStageTransition,
  type NewClarificationRequest,
  type ClarificationRequest,
} from '@/lib/db/schema';

// ── Shared view type ──────────────────────────────────────────────────────────

export interface StageTransitionView {
  id: string;
  stage: string;
  action: string;
  notes: string;
  adminDisplayName: string;
  adminId: string;
  createdAt: number;
}

export interface PipelineCounts {
  screening: number;
  technical_review: number;
  business_review: number;
  final_decision: number;
  awaiting_clarification: number;
}

// ── Stage Transitions ─────────────────────────────────────────────────────────

export function insertStageTransition(
  input: NewStageTransition,
  db: DB
): void {
  db.insert(stageTransitions).values(input).run();
}

export async function getStageTransitions(
  ideaId: string,
  db: DB
): Promise<StageTransitionView[]> {
  const rows = await db
    .select({
      id: stageTransitions.id,
      stage: stageTransitions.stage,
      action: stageTransitions.action,
      notes: stageTransitions.notes,
      adminDisplayName: users.displayName,
      adminId: stageTransitions.adminId,
      createdAt: stageTransitions.createdAt,
    })
    .from(stageTransitions)
    .innerJoin(users, eq(stageTransitions.adminId, users.id))
    .where(eq(stageTransitions.ideaId, ideaId))
    .orderBy(asc(stageTransitions.createdAt));

  return rows;
}

// ── Clarification Requests ────────────────────────────────────────────────────

export function insertClarificationRequest(
  input: NewClarificationRequest,
  db: DB
): void {
  db.insert(clarificationRequests).values(input).run();
}

export async function getPendingClarification(
  ideaId: string,
  db: DB
): Promise<ClarificationRequest | null> {
  const [row] = await db
    .select()
    .from(clarificationRequests)
    .where(eq(clarificationRequests.ideaId, ideaId))
    .orderBy(asc(clarificationRequests.requestedAt));

  if (!row) return null;
  // Pending means not yet responded and not cancelled
  if (row.response !== null || row.cancelledAt !== null) return null;
  return row;
}

export function resolveClarification(
  id: string,
  responderId: string,
  response: string,
  db: DB
): void {
  const now = Math.floor(Date.now() / 1000);
  db.update(clarificationRequests)
    .set({ response, responderId, respondedAt: now })
    .where(eq(clarificationRequests.id, id))
    .run();
}

export function cancelClarification(
  id: string,
  cancelledById: string,
  db: DB
): void {
  const now = Math.floor(Date.now() / 1000);
  db.update(clarificationRequests)
    .set({ cancelledAt: now, cancelledById })
    .where(eq(clarificationRequests.id, id))
    .run();
}

// ── Pipeline Counts ───────────────────────────────────────────────────────────

export async function getPipelineCounts(db: DB): Promise<PipelineCounts> {
  const pipelineStatuses = [
    'screening',
    'technical_review',
    'business_review',
    'final_decision',
    'awaiting_clarification',
  ] as const;

  const rows = await db
    .select({ status: ideas.status, count: sql<number>`COUNT(*)` })
    .from(ideas)
    .where(inArray(ideas.status, [...pipelineStatuses]))
    .groupBy(ideas.status);

  const counts: PipelineCounts = {
    screening: 0,
    technical_review: 0,
    business_review: 0,
    final_decision: 0,
    awaiting_clarification: 0,
  };

  for (const row of rows) {
    const key = row.status as keyof PipelineCounts;
    if (key in counts) {
      counts[key] = Number(row.count);
    }
  }

  return counts;
}

// ── Stale Clarifications ──────────────────────────────────────────────────────

/**
 * Returns idea IDs where a pending clarification was requested more than
 * 7 days ago and has not been responded to or cancelled.
 */
export async function getStaleClarificationIdeaIds(db: DB): Promise<string[]> {
  const staleCutoff = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  const rows = await db
    .select({ ideaId: clarificationRequests.ideaId })
    .from(clarificationRequests)
    .where(
      sql`${clarificationRequests.response} IS NULL
        AND ${clarificationRequests.cancelledAt} IS NULL
        AND ${clarificationRequests.requestedAt} < ${staleCutoff}`
    );

  return rows.map((r) => r.ideaId);
}
