'use server';

import { auth } from '@/auth';
import { db, type DB } from '@/lib/db';
import { ideas, stageTransitions, clarificationRequests } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import {
  getNextStage,
  isActivePipelineStage,
} from '@/lib/ideas/pipelineMachine';
import type { PipelineStage } from '@/lib/ideas/pipelineMachine';
import { validateNotes, validateQuestion, validateResponse } from '@/lib/pipeline/pipelineValidator';
import {
  getStageTransitions,
  getPendingClarification,
  getPipelineCounts as repoGetPipelineCounts,
  getStaleClarificationIdeaIds as repoGetStaleClarificationIdeaIds,
  type StageTransitionView,
  type PipelineCounts,
} from '@/lib/pipeline/pipelineRepository';

export interface PipelineActionResult {
  error?: string;
  conflict?: true;
}

// ── Auth guards ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/ideas');
  return session.user;
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

// ── startPipelineReview ───────────────────────────────────────────────────────

export async function startPipelineReview(
  ideaId: string,
  dbInstance: DB = db
): Promise<PipelineActionResult> {
  const adminUser = await requireAdmin();

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };
  if (idea.status !== 'submitted' && idea.status !== 'under_review') {
    return { error: 'Idea must be in submitted or under_review state to start pipeline review' };
  }

  const now = Math.floor(Date.now() / 1000);

  dbInstance.transaction((tx) => {
    tx.update(ideas)
      .set({ status: 'screening', evaluatingAdminId: adminUser.id })
      .where(eq(ideas.id, ideaId))
      .run();

    tx.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      stage: 'screening',
      action: 'advanced',
      notes: 'Pipeline review started',
      adminId: adminUser.id,
      createdAt: now,
    }).run();
  });

  return {};
}

// ── advanceStage ──────────────────────────────────────────────────────────────

export async function advanceStage(
  _prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<PipelineActionResult> {
  const adminUser = await requireAdmin();

  const ideaId = (formData.get('ideaId') as string) ?? '';
  const expectedStatus = (formData.get('expectedStatus') as string) ?? '';
  const notes = ((formData.get('notes') as string) ?? '').trim();

  const notesValidation = validateNotes(notes);
  if (!notesValidation.valid) return { error: notesValidation.error };

  // Read current state before transaction (SQLite serialises writes)
  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };
  if (idea.status !== expectedStatus) return { conflict: true };
  if (!isActivePipelineStage(idea.status)) return { conflict: true };

  const currentStage = idea.status as PipelineStage;
  const nextStage = getNextStage(currentStage);
  if (!nextStage) return { error: 'No further stages available; use approve or reject' };

  const now = Math.floor(Date.now() / 1000);

  dbInstance.transaction((tx) => {
    tx.update(ideas)
      .set({ status: nextStage })
      .where(eq(ideas.id, ideaId))
      .run();

    tx.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      stage: currentStage,
      action: 'advanced',
      notes,
      adminId: adminUser.id,
      createdAt: now,
    }).run();
  });

  revalidatePath(`/admin/ideas/${ideaId}`);
  revalidatePath('/admin/ideas');
  return {};
}

// ── approveAtFinalDecision ────────────────────────────────────────────────────

export async function approveAtFinalDecision(
  _prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<PipelineActionResult> {
  const adminUser = await requireAdmin();

  const ideaId = (formData.get('ideaId') as string) ?? '';
  const expectedStatus = (formData.get('expectedStatus') as string) ?? '';
  const notes = ((formData.get('notes') as string) ?? '').trim();

  const notesValidation = validateNotes(notes);
  if (!notesValidation.valid) return { error: notesValidation.error };

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };
  if (idea.status !== expectedStatus || idea.status !== 'final_decision') return { conflict: true };

  const now = Math.floor(Date.now() / 1000);

  dbInstance.transaction((tx) => {
    tx.update(ideas)
      .set({ status: 'approved', evaluatedAt: now })
      .where(eq(ideas.id, ideaId))
      .run();

    tx.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      stage: 'final_decision',
      action: 'approved',
      notes,
      adminId: adminUser.id,
      createdAt: now,
    }).run();
  });

  revalidatePath(`/admin/ideas/${ideaId}`);
  revalidatePath('/admin/ideas');
  return {};
}

// ── rejectAtStage ─────────────────────────────────────────────────────────────

export async function rejectAtStage(
  _prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<PipelineActionResult> {
  const adminUser = await requireAdmin();

  const ideaId = (formData.get('ideaId') as string) ?? '';
  const expectedStatus = (formData.get('expectedStatus') as string) ?? '';
  const notes = ((formData.get('notes') as string) ?? '').trim();

  const notesValidation = validateNotes(notes);
  if (!notesValidation.valid) return { error: notesValidation.error };

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };
  if (idea.status !== expectedStatus) return { conflict: true };
  if (!isActivePipelineStage(idea.status)) return { conflict: true };

  const currentStage = idea.status as PipelineStage;
  const now = Math.floor(Date.now() / 1000);

  dbInstance.transaction((tx) => {
    tx.update(ideas)
      .set({ status: 'rejected', evaluatedAt: now })
      .where(eq(ideas.id, ideaId))
      .run();

    tx.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      stage: currentStage,
      action: 'rejected',
      notes,
      adminId: adminUser.id,
      createdAt: now,
    }).run();
  });

  revalidatePath(`/admin/ideas/${ideaId}`);
  revalidatePath('/admin/ideas');
  return {};
}

// ── getPipelineHistory ────────────────────────────────────────────────────────

export async function getPipelineHistory(
  ideaId: string,
  dbInstance: DB = db
): Promise<StageTransitionView[] | PipelineActionResult> {
  const user = await requireAuth();

  if (user.role !== 'admin') {
    const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
    if (!idea || idea.submitterId !== user.id) {
      return { error: 'Not authorized' };
    }
  }

  return getStageTransitions(ideaId, dbInstance);
}

// ── requestClarification ──────────────────────────────────────────────────────

export async function requestClarification(
  _prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<PipelineActionResult> {
  const adminUser = await requireAdmin();

  const ideaId = (formData.get('ideaId') as string) ?? '';
  const expectedStatus = (formData.get('expectedStatus') as string) ?? '';
  const question = ((formData.get('question') as string) ?? '').trim();
  const notes = ((formData.get('notes') as string) ?? '').trim();

  const questionValidation = validateQuestion(question);
  if (!questionValidation.valid) return { error: questionValidation.error };

  const notesValidation = validateNotes(notes);
  if (!notesValidation.valid) return { error: notesValidation.error };

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };
  if (idea.status !== expectedStatus) return { conflict: true };
  if (idea.status === 'awaiting_clarification') {
    return { error: 'Idea is already awaiting clarification' };
  }
  if (!isActivePipelineStage(idea.status)) return { conflict: true };

  const currentStage = idea.status as PipelineStage;
  const clarificationId = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  dbInstance.transaction((tx) => {
    tx.insert(clarificationRequests).values({
      id: clarificationId,
      ideaId,
      stageWhenRequested: currentStage,
      question,
      questionerId: adminUser.id,
      requestedAt: now,
      response: null,
      responderId: null,
      respondedAt: null,
      cancelledAt: null,
      cancelledById: null,
    }).run();

    tx.update(ideas)
      .set({ status: 'awaiting_clarification', activeClarificationId: clarificationId })
      .where(eq(ideas.id, ideaId))
      .run();

    tx.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      stage: currentStage,
      action: 'awaiting_clarification',
      notes,
      adminId: adminUser.id,
      createdAt: now,
    }).run();
  });

  revalidatePath(`/admin/ideas/${ideaId}`);
  revalidatePath('/admin/ideas');
  return {};
}

// ── cancelClarification ───────────────────────────────────────────────────────

export async function cancelClarification(
  _prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<PipelineActionResult> {
  const adminUser = await requireAdmin();

  const ideaId = (formData.get('ideaId') as string) ?? '';
  const clarificationId = (formData.get('clarificationId') as string) ?? '';
  const notes = ((formData.get('notes') as string) ?? '').trim();

  const notesValidation = validateNotes(notes);
  if (!notesValidation.valid) return { error: notesValidation.error };

  const pending = await getPendingClarification(ideaId, dbInstance);
  if (!pending || pending.id !== clarificationId) {
    return { error: 'Clarification request not found' };
  }

  const now = Math.floor(Date.now() / 1000);
  const revertStage = pending.stageWhenRequested as PipelineStage;

  dbInstance.transaction((tx) => {
    tx.update(clarificationRequests)
      .set({ cancelledAt: now, cancelledById: adminUser.id })
      .where(eq(clarificationRequests.id, clarificationId))
      .run();

    tx.update(ideas)
      .set({ status: revertStage, activeClarificationId: null })
      .where(eq(ideas.id, ideaId))
      .run();

    tx.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      stage: revertStage,
      action: 'clarification_cancelled',
      notes,
      adminId: adminUser.id,
      createdAt: now,
    }).run();
  });

  revalidatePath(`/admin/ideas/${ideaId}`);
  revalidatePath('/admin/ideas');
  return {};
}

// ── respondToClarification ────────────────────────────────────────────────────

export async function respondToClarification(
  _prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<PipelineActionResult> {
  const user = await requireAuth();

  const ideaId = (formData.get('ideaId') as string) ?? '';
  const clarificationId = (formData.get('clarificationId') as string) ?? '';
  const response = ((formData.get('response') as string) ?? '').trim();

  const responseValidation = validateResponse(response);
  if (!responseValidation.valid) return { error: responseValidation.error };

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea || idea.submitterId !== user.id) {
    return { error: 'Not authorized' };
  }

  const pending = await getPendingClarification(ideaId, dbInstance);
  if (!pending || pending.id !== clarificationId) {
    return { error: 'Clarification request not found' };
  }

  const now = Math.floor(Date.now() / 1000);
  const revertStage = pending.stageWhenRequested as PipelineStage;

  dbInstance.transaction((tx) => {
    tx.update(clarificationRequests)
      .set({ response, responderId: user.id, respondedAt: now })
      .where(eq(clarificationRequests.id, clarificationId))
      .run();

    tx.update(ideas)
      .set({ status: revertStage, activeClarificationId: null })
      .where(eq(ideas.id, ideaId))
      .run();

    tx.insert(stageTransitions).values({
      id: randomUUID(),
      ideaId,
      stage: revertStage,
      action: 'clarification_resolved',
      notes: response,
      adminId: pending.questionerId,
      createdAt: now,
    }).run();
  });

  revalidatePath(`/ideas/${ideaId}`);
  return {};
}

// ── getPipelineCounts ─────────────────────────────────────────────────────────

export async function getPipelineCounts(
  dbInstance: DB = db
): Promise<PipelineCounts> {
  await requireAdmin();
  return repoGetPipelineCounts(dbInstance);
}

// ── getStaleClarificationIdeaIds ──────────────────────────────────────────────

export async function getStaleClarificationIdeaIds(
  dbInstance: DB = db
): Promise<string[]> {
  await requireAdmin();
  return repoGetStaleClarificationIdeaIds(dbInstance);
}


