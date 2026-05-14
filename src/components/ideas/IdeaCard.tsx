import { format } from 'date-fns';
import { IdeaWithAttachments } from '@/lib/actions/ideas';
import Link from 'next/link';
import { Tag, Calendar, Paperclip, ArrowRight } from 'lucide-react';

const statusConfig: Record<string, { label: string; colorClass: string }> = {
  submitted: { label: 'Submitted', colorClass: 'bg-blue-500/20 text-blue-400' },
  under_review: { label: 'Under Review', colorClass: 'bg-amber-500/20 text-amber-400' },
  accepted: { label: 'Accepted', colorClass: 'bg-green-500/20 text-green-400' },
  rejected: { label: 'Rejected', colorClass: 'bg-red-500/20 text-red-400' },
  screening: { label: 'Screening', colorClass: 'bg-purple-500/20 text-purple-400' },
  technical_review: { label: 'Technical Review', colorClass: 'bg-indigo-500/20 text-indigo-400' },
  business_review: { label: 'Business Review', colorClass: 'bg-cyan-500/20 text-cyan-400' },
  final_decision: { label: 'Final Decision', colorClass: 'bg-orange-500/20 text-orange-400' },
  awaiting_clarification: { label: 'Awaiting Clarification', colorClass: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: 'Approved', colorClass: 'bg-green-500/20 text-green-400' },
};

interface IdeaCardProps {
  idea: IdeaWithAttachments;
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const submittedDate = format(new Date(idea.submittedAt * 1000), 'dd MMM yyyy');
  const config = statusConfig[idea.status] ?? { label: idea.status, colorClass: 'bg-neutral-100 text-neutral-700' };
  const categoryLabel = idea.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Link href={`/ideas/${idea.id}`} className="block group">
      <article className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-brand-500 transition-all p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground group-hover:text-brand-400 transition-colors leading-snug">
            {idea.title}
          </h3>
          <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${config.colorClass}`}>
            {config.label}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            {categoryLabel}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {submittedDate}
          </span>
          {idea.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              {idea.attachments.length} attachment{idea.attachments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <span className="text-xs text-brand-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </article>
    </Link>
  );
}
