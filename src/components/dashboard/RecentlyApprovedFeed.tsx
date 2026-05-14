import Link from 'next/link';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import type { RecentlyApprovedIdea } from '@/lib/actions/spotlight';

interface RecentlyApprovedFeedProps {
  ideas: RecentlyApprovedIdea[];
  hasMore: boolean;
}

export function RecentlyApprovedFeed({ ideas, hasMore }: RecentlyApprovedFeedProps) {
  if (ideas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center justify-center gap-2 py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">The first approved idea will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <ul className="divide-y divide-border">
        {ideas.map((idea) => (
          <li key={idea.id} className="px-4 py-3 hover:bg-secondary transition-colors">
            <Link href={`/ideas/${idea.id}`} className="block">
              <p className="text-sm font-medium text-foreground hover:text-brand-400 transition-colors truncate">
                {idea.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{idea.category}</span>
                <span>{format(new Date(idea.evaluatedAt * 1000), 'dd MMM yyyy')}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="px-4 py-3 border-t border-border">
          <Link
            href="/ideas?status=approved"
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all approved ideas →
          </Link>
        </div>
      )}
    </div>
  );
}
