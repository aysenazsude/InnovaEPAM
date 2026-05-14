import Link from 'next/link';
import { PlusCircle, List } from 'lucide-react';

export function QuickActions() {
  return (
    <section aria-label="quick actions" className="flex flex-wrap gap-3">
      <Link
        href="/ideas/new"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Submit New Idea
      </Link>
      <Link
        href="/ideas"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-card transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <List className="h-4 w-4" aria-hidden="true" />
        View All My Ideas
      </Link>
    </section>
  );
}
