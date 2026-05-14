'use client';

import Link from 'next/link';
import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import { deleteDraft, type DeleteDraftResult } from '@/lib/actions/drafts';
import type { DraftSummary } from '@/lib/drafts/draftRepository';

interface DraftListProps {
  drafts: DraftSummary[];
}

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DraftList({ drafts: initialDrafts }: DraftListProps) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(draftId: string) {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;

    setDeletingId(draftId);
    setError(null);

    startTransition(async () => {
      const result: DeleteDraftResult = await deleteDraft(draftId);
      if (result.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      } else {
        setError(result.errors?.form ?? 'Failed to delete draft.');
      }
      setDeletingId(null);
    });
  }

  if (drafts.length === 0) {
    return (
      <p className="text-neutral-500">
        You have no saved drafts.{' '}
        <Link href="/ideas/new" className="text-brand-600 underline">
          Start a new idea
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200" role="list">
        {drafts.map((draft) => (
          <li key={draft.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/ideas/new?draftId=${draft.id}`}
                className="block truncate font-medium text-neutral-900 hover:underline"
              >
                {draft.title ?? <em className="text-neutral-400">Untitled draft</em>}
              </Link>
              <p className="text-xs text-neutral-500 mt-0.5">
                Last saved {formatDate(draft.updatedAt)}
                {draft.attachmentCount > 0 && ` · ${draft.attachmentCount} attachment${draft.attachmentCount > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/ideas/new?draftId=${draft.id}`}>Resume</Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending && deletingId === draft.id}
                onClick={() => handleDelete(draft.id)}
                aria-label={`Delete draft: ${draft.title ?? 'Untitled draft'}`}
              >
                {isPending && deletingId === draft.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
