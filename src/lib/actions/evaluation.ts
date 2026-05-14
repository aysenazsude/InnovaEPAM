'use server';

import { auth } from '@/auth';
import { db, type DB } from '@/lib/db';
import { ideas } from '@/lib/db/schema';
import { transition } from '@/lib/ideas/statusMachine';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

export interface EvaluationResult {
  error?: string;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/ideas');
  return session.user;
}

export async function transitionToUnderReview(ideaId: string, dbInstance: DB = db): Promise<EvaluationResult> {
  const adminUser = await requireAdmin();

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };

  try {
    transition(idea.status, 'under_review');
  } catch {
    // Already past submitted — silently no-op for page-load call
    return {};
  }

  await dbInstance
    .update(ideas)
    .set({ status: 'under_review', evaluatingAdminId: adminUser.id })
    .where(eq(ideas.id, ideaId));

  return {};
}

export async function acceptIdea(ideaId: string, comment: string, dbInstance: DB = db): Promise<EvaluationResult> {
  const adminUser = await requireAdmin();

  const trimmed = comment.trim();
  if (!trimmed) return { error: 'Comment is required' };

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };

  try {
    transition(idea.status, 'accepted');
  } catch {
    return { error: 'Idea cannot be evaluated in its current status' };
  }

  const now = Math.floor(Date.now() / 1000);
  await dbInstance
    .update(ideas)
    .set({
      status: 'accepted',
      adminComment: trimmed,
      evaluatingAdminId: adminUser.id,
      evaluatedAt: now,
    })
    .where(eq(ideas.id, ideaId));

  revalidatePath('/admin');
  revalidatePath('/ideas');
  return {};
}

export async function rejectIdea(ideaId: string, comment: string, dbInstance: DB = db): Promise<EvaluationResult> {
  const adminUser = await requireAdmin();

  const trimmed = comment.trim();
  if (!trimmed) return { error: 'Comment is required' };

  const [idea] = await dbInstance.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) return { error: 'Idea not found' };

  try {
    transition(idea.status, 'rejected');
  } catch {
    return { error: 'Idea cannot be evaluated in its current status' };
  }

  const now = Math.floor(Date.now() / 1000);
  await dbInstance
    .update(ideas)
    .set({
      status: 'rejected',
      adminComment: trimmed,
      evaluatingAdminId: adminUser.id,
      evaluatedAt: now,
    })
    .where(eq(ideas.id, ideaId));

  revalidatePath('/admin');
  revalidatePath('/ideas');
  return {};
}
