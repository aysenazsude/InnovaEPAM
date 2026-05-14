import Link from 'next/link';
import { Send, CheckCircle, Clock, ArrowRight, Inbox } from 'lucide-react';
import type { UserStats, LastSubmission } from '@/lib/actions/dashboard';

interface UserStatsPanelProps {
  userStats: UserStats;
  lastSubmission: LastSubmission | null;
  userName: string;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const statusBadgeClass: Record<string, string> = {
  submitted: 'bg-blue-500/20 text-blue-400',
  screening: 'bg-purple-500/20 text-purple-400',
  technical_review: 'bg-indigo-500/20 text-indigo-400',
  business_review: 'bg-cyan-500/20 text-cyan-400',
  final_decision: 'bg-orange-500/20 text-orange-400',
  awaiting_clarification: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

export function UserStatsPanel({ userStats, lastSubmission, userName }: UserStatsPanelProps) {
  const { totalSubmitted, totalApproved, totalPending } = userStats;

  const personalStats = [
    { label: 'Submitted', value: totalSubmitted, icon: <Send className="h-4 w-4" aria-hidden="true" />, colorClass: 'text-brand-400 bg-brand-500/20' },
    { label: 'Approved', value: totalApproved, icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />, colorClass: 'text-green-400 bg-green-500/20' },
    { label: 'In Review', value: totalPending, icon: <Clock className="h-4 w-4" aria-hidden="true" />, colorClass: 'text-orange-400 bg-orange-500/20' },
  ];

  return (
    <section aria-label="your activity" className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Activity</h2>
          <p className="text-sm text-muted-foreground">Welcome back, {userName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {personalStats.map(({ label, value, icon, colorClass }) => (
          <div key={label} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
            <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${colorClass}`}>
              {icon}
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {totalSubmitted === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-brand-800 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <span className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center">
              <Inbox className="h-7 w-7 text-brand-400" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">No ideas submitted yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              You have not submitted your first idea yet. Share what you are thinking!
            </p>
          </div>
          <Link
            href="/ideas/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Submit Your First Idea
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        lastSubmission && (
          <Link href={`/ideas/${lastSubmission.id}`} className="block">
            <article className="bg-card rounded-xl border border-border shadow-sm p-4 hover:border-brand-500 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Submission</p>
                  <p className="font-semibold text-foreground truncate">{lastSubmission.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(lastSubmission.submittedAt)}</p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    statusBadgeClass[lastSubmission.status] ?? 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {formatStatus(lastSubmission.status)}
                </span>
              </div>
            </article>
          </Link>
        )
      )}
    </section>
  );
}
