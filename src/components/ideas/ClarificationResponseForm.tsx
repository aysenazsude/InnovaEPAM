'use client';

import { useActionState } from 'react';
import { respondToClarification, type PipelineActionResult } from '@/lib/actions/pipeline';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClarificationResponseFormProps {
  ideaId: string;
  clarificationId: string;
  question: string;
}

export function ClarificationResponseForm({
  ideaId,
  clarificationId,
  question,
}: ClarificationResponseFormProps) {
  const [state, dispatch, isPending] = useActionState<PipelineActionResult | null, FormData>(
    respondToClarification,
    null
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700">
        <span className="font-medium">Question from reviewer: </span>
        {question}
      </p>

      {state?.error && (
        <div role="alert" aria-live="polite" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={dispatch} className="space-y-3">
        <input type="hidden" name="ideaId" value={ideaId} />
        <input type="hidden" name="clarificationId" value={clarificationId} />

        <div>
          <Label htmlFor="clarification-response">
            Your Response <span aria-hidden="true" className="text-red-500">*</span>
          </Label>
          <Textarea
            id="clarification-response"
            name="response"
            required
            maxLength={2000}
            rows={4}
            placeholder="Provide the information requested by the reviewer…"
            className="mt-1"
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Submitting…' : 'Submit Response'}
        </Button>
      </form>
    </div>
  );
}
