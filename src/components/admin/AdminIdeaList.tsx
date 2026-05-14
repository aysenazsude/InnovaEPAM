'use client';

import { useState } from 'react';
import type { AdminIdeaView } from '@/lib/ideas/anonymize';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import type { PipelineCounts } from '@/lib/pipeline/pipelineRepository';
import { PIPELINE_STAGES } from '@/lib/ideas/pipelineMachine';
import { pinEditorsPickAction, unpinEditorsPickAction } from '@/lib/actions/spotlight';

type StatusFilter =
  | 'all'
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'pipeline'
  | 'screening'
  | 'technical_review'
  | 'business_review'
  | 'final_decision'
  | 'awaiting_clarification'
  | 'approved';

const PIPELINE_STATUSES = new Set([
  'screening',
  'technical_review',
  'business_review',
  'final_decision',
  'awaiting_clarification',
  'approved',
]);

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const PIPELINE_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'screening', label: 'Screening' },
  { value: 'technical_review', label: 'Technical Review' },
  { value: 'business_review', label: 'Business Review' },
  { value: 'final_decision', label: 'Final Decision' },
  { value: 'awaiting_clarification', label: 'Awaiting Clarification' },
  { value: 'approved', label: 'Approved' },
];

const statusClass: Record<string, string> = {
  submitted: 'bg-blue-500/20 text-blue-400',
  under_review: 'bg-amber-500/20 text-amber-400',
  accepted: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  screening: 'bg-purple-500/20 text-purple-400',
  technical_review: 'bg-indigo-500/20 text-indigo-400',
  business_review: 'bg-cyan-500/20 text-cyan-400',
  final_decision: 'bg-orange-500/20 text-orange-400',
  awaiting_clarification: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
};

function isPipelineIdea(idea: AdminIdeaView): boolean {
  return PIPELINE_STATUSES.has(idea.status);
}

interface AdminIdeaListProps {
  ideas: AdminIdeaView[];
  pipelineCounts?: PipelineCounts;
  staleClarificationIdeaIds?: Set<string>;
  currentPickIdeaId?: string | null;
}

export function AdminIdeaList({ ideas, pipelineCounts, staleClarificationIdeaIds, currentPickIdeaId }: AdminIdeaListProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered =
    filter === 'all'
      ? ideas
      : filter === 'pipeline'
      ? ideas.filter(isPipelineIdea)
      : ideas.filter((i) => i.status === filter);

  const showPipelineSubfilters = filter === 'pipeline' || PIPELINE_STATUSES.has(filter);
  const totalPipeline = ideas.filter(isPipelineIdea).length;

  return (
    <div className="space-y-4">
      {/* Primary filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              filter === value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-secondary text-muted-foreground border-border hover:bg-card hover:text-foreground'
            }`}
          >
            {label}
            {value === 'pipeline' && totalPipeline > 0 && (
              <span className="ml-1.5 rounded-full bg-white/30 px-1.5 text-xs">
                {totalPipeline}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pipeline stage sub-filters */}
      {showPipelineSubfilters && pipelineCounts && (
        <div className="flex gap-2 flex-wrap pl-2 border-l-2 border-purple-800">
          <button
            onClick={() => setFilter('pipeline')}
            className={`px-2 py-0.5 rounded text-xs font-medium border ${
              filter === 'pipeline'
                ? 'bg-purple-500 text-white border-purple-500'
                : 'bg-secondary text-muted-foreground border-border hover:bg-card hover:text-foreground'
            }`}
          >
            All Pipeline
          </button>
          {PIPELINE_FILTERS.map(({ value, label }) => {
            const count = pipelineCounts[value as keyof PipelineCounts] ?? 0;
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  filter === value
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-secondary text-muted-foreground border-border hover:bg-card hover:text-foreground'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-purple-500/20 px-1.5 text-purple-400 text-xs">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No ideas in this category.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((idea) => {
            const href = isPipelineIdea(idea)
              ? `/admin/ideas/${idea.id}/review`
              : `/admin/ideas/${idea.id}`;
            return (
              <li key={idea.id}>
                <Link href={href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">{idea.title}</CardTitle>
                        {staleClarificationIdeaIds?.has(idea.id) && (
                          <span className="text-xs font-semibold text-amber-400 bg-amber-500/20 border border-amber-800 rounded px-1.5 py-0.5">
                            ⚠ Stale
                          </span>
                        )}
                        </div>
                        <div className="flex items-center gap-2">
                          {currentPickIdeaId === idea.id && (
                            <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/20 border border-yellow-800 rounded px-1.5 py-0.5">
                              👑 Editor&apos;s Pick
                            </span>
                          )}
                          {idea.aggregateScore !== undefined && (
                            <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/20 border border-yellow-800 rounded px-1.5 py-0.5">
                              ★ {idea.aggregateScore}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              statusClass[idea.status] ?? ''
                            }`}
                          >
                            {idea.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {idea.category.replace(/_/g, ' ')} &middot;{' '}
                        {format(new Date(idea.submittedAt * 1000), 'dd MMM yyyy')}
                      </p>
                    </CardHeader>
                  </Card>
                </Link>
                {/* Pin/Unpin Editor's Pick action */}
                <div className="mt-1 flex justify-end px-1">
                  {currentPickIdeaId === idea.id ? (
                    <form action={unpinEditorsPickAction}>
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 hover:bg-secondary transition-colors"
                      >
                        Unpin Editor&apos;s Pick
                      </button>
                    </form>
                  ) : (
                    <form action={pinEditorsPickAction}>
                      <input type="hidden" name="ideaId" value={idea.id} />
                      <button
                        type="submit"
                        className="text-xs text-yellow-400/70 hover:text-yellow-400 border border-yellow-900 rounded px-2 py-0.5 hover:bg-yellow-500/10 transition-colors"
                      >
                        Pin as Editor&apos;s Pick
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
