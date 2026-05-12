'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { acceptIdea, rejectIdea } from '@/lib/actions/evaluation';
import { useRouter } from 'next/navigation';

interface EvaluationFormProps {
  ideaId: string;
}

export function EvaluationForm({ ideaId }: EvaluationFormProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleAction(action: 'accept' | 'reject') {
    if (!comment.trim()) {
      setError('Comment is required');
      return;
    }
    setError(null);
    setPending(true);

    const fn = action === 'accept' ? acceptIdea : rejectIdea;
    const result = await fn(ideaId, comment);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="admin-comment">Comment</Label>
        <Textarea
          id="admin-comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Provide feedback for the submitter…"
          disabled={pending}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          variant="default"
          onClick={() => handleAction('accept')}
          disabled={pending}
          className="bg-green-600 hover:bg-green-700"
        >
          {pending ? '…' : 'Accept'}
        </Button>
        <Button
          variant="destructive"
          onClick={() => handleAction('reject')}
          disabled={pending}
        >
          {pending ? '…' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}
