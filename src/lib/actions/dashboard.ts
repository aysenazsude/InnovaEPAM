'use server';

import { auth } from '@/auth';
import { db, type DB } from '@/lib/db';
import { ideas } from '@/lib/db/schema';
import { redirect } from 'next/navigation';
import { sql, eq } from 'drizzle-orm';

const PIPELINE_STATUSES = [
  'screening',
  'technical_review',
  'business_review',
  'final_decision',
  'awaiting_clarification',
] as const;

export interface SystemStats {
  totalSubmitted: number;
  totalApproved: number;
  totalInPipeline: number;
}

export interface UserStats {
  totalSubmitted: number;
  totalApproved: number;
  totalPending: number;
}

export interface LastSubmission {
  id: string;
  title: string;
  status: string;
  submittedAt: number;
}

export interface DashboardData {
  systemStats: SystemStats;
  userStats: UserStats;
  lastSubmission: LastSubmission | null;
}

export async function getDashboardData(dbInstance: DB = db): Promise<DashboardData> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  const [systemResult, userResult, lastResult] = await Promise.all([
    // System-wide aggregates
    dbInstance
      .select({
        total: sql<number>`COUNT(*)`,
        approved: sql<number>`SUM(CASE WHEN ${ideas.status} = 'approved' THEN 1 ELSE 0 END)`,
        inPipeline: sql<number>`SUM(CASE WHEN ${ideas.status} IN (${sql.join(PIPELINE_STATUSES.map((s) => sql`${s}`), sql`, `)}) THEN 1 ELSE 0 END)`,
      })
      .from(ideas),

    // Per-user aggregates
    dbInstance
      .select({
        total: sql<number>`COUNT(*)`,
        approved: sql<number>`SUM(CASE WHEN ${ideas.status} = 'approved' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN ${ideas.status} IN (${sql.join(PIPELINE_STATUSES.map((s) => sql`${s}`), sql`, `)}) THEN 1 ELSE 0 END)`,
      })
      .from(ideas)
      .where(eq(ideas.submitterId, userId)),

    // Last submission
    dbInstance
      .select({
        id: ideas.id,
        title: ideas.title,
        status: ideas.status,
        submittedAt: ideas.submittedAt,
      })
      .from(ideas)
      .where(eq(ideas.submitterId, userId))
      .orderBy(sql`${ideas.submittedAt} DESC`)
      .limit(1),
  ]);

  const sys = systemResult[0];
  const usr = userResult[0];

  return {
    systemStats: {
      totalSubmitted: Number(sys?.total ?? 0),
      totalApproved: Number(sys?.approved ?? 0),
      totalInPipeline: Number(sys?.inPipeline ?? 0),
    },
    userStats: {
      totalSubmitted: Number(usr?.total ?? 0),
      totalApproved: Number(usr?.approved ?? 0),
      totalPending: Number(usr?.pending ?? 0),
    },
    lastSubmission: lastResult[0]
      ? {
          id: lastResult[0].id,
          title: lastResult[0].title,
          status: lastResult[0].status,
          submittedAt: lastResult[0].submittedAt,
        }
      : null,
  };
}
