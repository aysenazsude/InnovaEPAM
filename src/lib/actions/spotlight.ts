'use server';

import { auth } from '@/auth';
import { db, type DB } from '@/lib/db';
import { ideas, users, evaluationScores, spotlightPicks } from '@/lib/db/schema';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql, eq, desc, and, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const PIPELINE_STATUSES = [
  'screening',
  'technical_review',
  'business_review',
  'final_decision',
  'awaiting_clarification',
] as const;

export interface SpotlightIdea {
  id: string;
  title: string;
  authorName: string;
  category: string;
  compositeScore: number | null;
  submittedAt: number;
  label: 'Top Rated' | "Editor's Pick" | 'Score Pending';
}

export interface RecentlyApprovedIdea {
  id: string;
  title: string;
  category: string;
  evaluatedAt: number;
}

export interface MonthlyActivity {
  submitted: number;
  inReview: number;
  approved: number;
  monthLabel: string;
}

export interface SpotlightPageData {
  spotlight: SpotlightIdea | null;
  recentlyApproved: RecentlyApprovedIdea[];
  hasMoreApproved: boolean;
  monthlyActivity: MonthlyActivity;
  currentPickIdeaId: string | null;
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

async function resolveSpotlight(
  dbInstance: DB,
  currentMonth: string
): Promise<SpotlightIdea | null> {
  // Step 1: Editor's Pick
  const picks = await dbInstance
    .select({
      ideaId: spotlightPicks.ideaId,
      title: ideas.title,
      category: ideas.category,
      submittedAt: ideas.submittedAt,
      authorName: users.displayName,
      compositeScore: sql<number | null>`AVG(${evaluationScores.score})`,
    })
    .from(spotlightPicks)
    .innerJoin(ideas, eq(spotlightPicks.ideaId, ideas.id))
    .innerJoin(users, eq(ideas.submitterId, users.id))
    .leftJoin(evaluationScores, eq(evaluationScores.ideaId, ideas.id))
    .where(eq(spotlightPicks.monthYear, currentMonth))
    .groupBy(spotlightPicks.ideaId)
    .limit(1);

  if (picks.length > 0) {
    const p = picks[0];
    return {
      id: p.ideaId,
      title: p.title,
      authorName: p.authorName,
      category: p.category,
      compositeScore: p.compositeScore ?? null,
      submittedAt: p.submittedAt,
      label: "Editor's Pick",
    };
  }

  // Step 2: Highest-scored idea this month
  const scored = await dbInstance
    .select({
      id: ideas.id,
      title: ideas.title,
      category: ideas.category,
      submittedAt: ideas.submittedAt,
      authorName: users.displayName,
      compositeScore: sql<number>`AVG(${evaluationScores.score})`,
    })
    .from(ideas)
    .innerJoin(users, eq(ideas.submitterId, users.id))
    .innerJoin(evaluationScores, eq(evaluationScores.ideaId, ideas.id))
    .where(
      sql`strftime('%Y-%m', datetime(${ideas.submittedAt}, 'unixepoch')) = ${currentMonth}`
    )
    .groupBy(ideas.id)
    .orderBy(sql`AVG(${evaluationScores.score}) DESC`, desc(ideas.submittedAt))
    .limit(1);

  if (scored.length > 0) {
    const s = scored[0];
    return {
      id: s.id,
      title: s.title,
      authorName: s.authorName,
      category: s.category,
      compositeScore: s.compositeScore,
      submittedAt: s.submittedAt,
      label: 'Top Rated',
    };
  }

  // Step 3: Most recent unscored idea this month
  const unscored = await dbInstance
    .select({
      id: ideas.id,
      title: ideas.title,
      category: ideas.category,
      submittedAt: ideas.submittedAt,
      authorName: users.displayName,
    })
    .from(ideas)
    .innerJoin(users, eq(ideas.submitterId, users.id))
    .where(
      sql`strftime('%Y-%m', datetime(${ideas.submittedAt}, 'unixepoch')) = ${currentMonth}`
    )
    .orderBy(desc(ideas.submittedAt))
    .limit(1);

  if (unscored.length > 0) {
    const u = unscored[0];
    return {
      id: u.id,
      title: u.title,
      authorName: u.authorName,
      category: u.category,
      compositeScore: null,
      submittedAt: u.submittedAt,
      label: 'Score Pending',
    };
  }

  return null;
}

export async function getSpotlightData(dbInstance: DB = db): Promise<SpotlightPageData> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const currentMonth = getCurrentMonth();

  const [spotlight, recentlyApprovedRaw, activityRaw, currentPick] = await Promise.all([
    resolveSpotlight(dbInstance, currentMonth),

    dbInstance
      .select({
        id: ideas.id,
        title: ideas.title,
        category: ideas.category,
        evaluatedAt: ideas.evaluatedAt,
      })
      .from(ideas)
      .where(and(eq(ideas.status, 'approved'), isNotNull(ideas.evaluatedAt)))
      .orderBy(desc(ideas.evaluatedAt))
      .limit(6),

    dbInstance
      .select({
        submitted: sql<number>`SUM(CASE WHEN strftime('%Y-%m', datetime(${ideas.submittedAt}, 'unixepoch')) = ${currentMonth} THEN 1 ELSE 0 END)`,
        inReview: sql<number>`SUM(CASE WHEN strftime('%Y-%m', datetime(${ideas.submittedAt}, 'unixepoch')) = ${currentMonth} AND ${ideas.status} IN (${sql.join(PIPELINE_STATUSES.map((s) => sql`${s}`), sql`, `)}) THEN 1 ELSE 0 END)`,
        approved: sql<number>`SUM(CASE WHEN ${ideas.status} = 'approved' AND ${ideas.evaluatedAt} IS NOT NULL AND strftime('%Y-%m', datetime(${ideas.evaluatedAt}, 'unixepoch')) = ${currentMonth} THEN 1 ELSE 0 END)`,
      })
      .from(ideas),

    dbInstance
      .select({ ideaId: spotlightPicks.ideaId })
      .from(spotlightPicks)
      .where(eq(spotlightPicks.monthYear, currentMonth))
      .limit(1),
  ]);

  const recentlyApproved: RecentlyApprovedIdea[] = recentlyApprovedRaw
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      evaluatedAt: r.evaluatedAt as number,
    }));

  const activity = activityRaw[0];
  const monthlyActivity: MonthlyActivity = {
    submitted: Number(activity?.submitted ?? 0),
    inReview: Number(activity?.inReview ?? 0),
    approved: Number(activity?.approved ?? 0),
    monthLabel: formatMonthLabel(currentMonth),
  };

  return {
    spotlight,
    recentlyApproved,
    hasMoreApproved: recentlyApprovedRaw.length > 5,
    monthlyActivity,
    currentPickIdeaId: currentPick[0]?.ideaId ?? null,
  };
}

export async function pinEditorsPick(
  ideaId: string,
  dbInstance: DB = db
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' };
  }

  if (!ideaId) {
    return { success: false, error: 'Invalid idea ID' };
  }

  try {
    const existing = await dbInstance
      .select({ id: ideas.id })
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: 'Idea not found' };
    }

    const currentMonth = getCurrentMonth();

    await dbInstance
      .insert(spotlightPicks)
      .values({
        id: randomUUID(),
        ideaId,
        monthYear: currentMonth,
        pinnedAt: Math.floor(Date.now() / 1000),
        pinnedByAdminId: session.user.id,
      })
      .onConflictDoUpdate({
        target: spotlightPicks.monthYear,
        set: {
          ideaId,
          pinnedAt: Math.floor(Date.now() / 1000),
          pinnedByAdminId: session.user.id,
        },
      });

    revalidatePath('/home');
    revalidatePath('/admin');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to pin idea' };
  }
}

export async function unpinEditorsPick(
  dbInstance: DB = db
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const currentMonth = getCurrentMonth();

    await dbInstance
      .delete(spotlightPicks)
      .where(eq(spotlightPicks.monthYear, currentMonth));

    revalidatePath('/home');
    revalidatePath('/admin');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to unpin' };
  }
}

// Form-action version for unpin — no extra parameters, suitable as form `action` prop
export async function unpinEditorsPickAction(_formData: FormData): Promise<void> {
  await unpinEditorsPick();
}

// Form-action version for pin — reads ideaId from hidden form input
export async function pinEditorsPickAction(formData: FormData): Promise<void> {
  const ideaId = formData.get('ideaId');
  if (typeof ideaId === 'string' && ideaId) {
    await pinEditorsPick(ideaId);
  }
}
