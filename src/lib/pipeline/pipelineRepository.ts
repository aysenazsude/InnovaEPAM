import { eq, asc, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { DB } from '@/lib/db';
import {
  stageTransitions,
  clarificationRequests,
  evaluationScores,
  users,
  ideas,
  type NewStageTransition,
  type NewClarificationRequest,
  type ClarificationRequest,
} from '@/lib/db/schema';
import type { ScoringDimension } from '@/lib/constants';
import { SCORING_DIMENSIONS } from '@/lib/constants';
import type { DimensionScores } from '@/lib/pipeline/scoringHelpers';

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

// ── Evaluation Scores (Phase 7 — scoring system) ──────────────────────────────

export interface StageScores {
  stage: string;
  transitionId: string;
  action: string;
  scores: Partial<Record<ScoringDimension, number>>;
  stageAverage: number | null;
}

export interface ScoreSummary {
  byStage: StageScores[];
  overallAverage: number | null;
}

export interface IdeaAggregateScore {
  ideaId: string;
  average: number;
}

/**
 * Inserts one evaluation_scores row per provided dimension score.
 * No-op if scores is empty. Called inside the caller's DB transaction.
 */
export function insertEvaluationScores(
  input: {
    transitionId: string;
    ideaId: string;
    adminId: string;
    scores: DimensionScores;
    createdAt: number;
  },
  db: DB
): void {
  const { transitionId, ideaId, adminId, scores, createdAt } = input;

  for (const { key } of SCORING_DIMENSIONS) {
    const score = scores[key];
    if (score === undefined) continue;
    db.insert(evaluationScores).values({
      id: randomUUID(),
      ideaId,
      stageTransitionId: transitionId,
      adminId,
      dimension: key,
      score,
      createdAt,
    }).run();
  }
}

/**
 * Returns the full score summary for one idea: per-stage dimension scores,
 * per-stage average (1 dp), and overall average (1 dp).
 * Averages are null when no scores exist for a stage / overall.
 */
export async function getScoreSummary(
  ideaId: string,
  db: DB
): Promise<ScoreSummary> {
  // Fetch all transitions for this idea (ordered by createdAt)
  const transitions = await db
    .select({
      id: stageTransitions.id,
      stage: stageTransitions.stage,
      action: stageTransitions.action,
    })
    .from(stageTransitions)
    .where(eq(stageTransitions.ideaId, ideaId))
    .orderBy(asc(stageTransitions.createdAt));

  if (transitions.length === 0) {
    return { byStage: [], overallAverage: null };
  }

  // Fetch all scores for this idea
  const scoreRows = await db
    .select({
      stageTransitionId: evaluationScores.stageTransitionId,
      dimension: evaluationScores.dimension,
      score: evaluationScores.score,
    })
    .from(evaluationScores)
    .where(eq(evaluationScores.ideaId, ideaId));

  // Group scores by transitionId
  const scoresByTransition = new Map<string, Partial<Record<ScoringDimension, number>>>();
  for (const row of scoreRows) {
    const existing = scoresByTransition.get(row.stageTransitionId) ?? {};
    existing[row.dimension as ScoringDimension] = row.score;
    scoresByTransition.set(row.stageTransitionId, existing);
  }

  let totalSum = 0;
  let totalCount = 0;

  const byStage: StageScores[] = transitions.map((t) => {
    const scores = scoresByTransition.get(t.id) ?? {};
    const values = Object.values(scores) as number[];
    const stageAverage =
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : null;

    totalSum += values.reduce((a, b) => a + b, 0);
    totalCount += values.length;

    return { stage: t.stage, transitionId: t.id, action: t.action, scores, stageAverage };
  });

  const overallAverage =
    totalCount > 0
      ? Math.round((totalSum / totalCount) * 10) / 10
      : null;

  return { byStage, overallAverage };
}

/**
 * Returns aggregate average scores for a list of idea IDs.
 * Only ideas with at least one score row are included in the result.
 */
export async function getIdeaAggregateScores(
  ideaIds: string[],
  db: DB
): Promise<IdeaAggregateScore[]> {
  if (ideaIds.length === 0) return [];

  const rows = await db
    .select({
      ideaId: evaluationScores.ideaId,
      avg: sql<number>`ROUND(AVG(${evaluationScores.score}), 1)`,
    })
    .from(evaluationScores)
    .where(inArray(evaluationScores.ideaId, ideaIds))
    .groupBy(evaluationScores.ideaId);

  return rows.map((r) => ({ ideaId: r.ideaId, average: Number(r.avg) }));
}
