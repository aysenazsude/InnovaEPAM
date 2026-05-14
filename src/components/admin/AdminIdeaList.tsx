'use client';

import { useState } from 'react';
import { IdeaWithAttachments } from '@/lib/actions/ideas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

type StatusFilter = 'all' | 'submitted' | 'under_review' | 'accepted' | 'rejected';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const statusClass: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

interface AdminIdeaListProps {
  ideas: IdeaWithAttachments[];
}

export function AdminIdeaList({ ideas }: AdminIdeaListProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = filter === 'all' ? ideas : ideas.filter((i) => i.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              filter === value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500 py-8 text-center">No ideas in this category.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((idea) => (
            <li key={idea.id}>
              <Link href={`/admin/ideas/${idea.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{idea.title}</CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass[idea.status] ?? ''}`}>
                        {idea.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {idea.category.replace(/_/g, ' ')} &middot;{' '}
                      {format(new Date(idea.submittedAt * 1000), 'dd MMM yyyy')}
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
