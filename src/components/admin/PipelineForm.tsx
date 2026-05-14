'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  advanceStage,
  approveAtFinalDecision,
  rejectAtStage,
  requestClarification,
  cancelClarification,
  type PipelineActionResult,
} from '@/lib/actions/pipeline';
import type { PipelineStage } from '@/lib/ideas/pipelineMachine';
import { getNextStage } from '@/lib/ideas/pipelineMachine';
import type { StageTransitionView } from '@/lib/pipeline/pipelineRepository';
import { ScoringPanel } from '@/components/admin/ScoringPanel';

// ── Label helpers ─────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<PipelineStage, string> = {
  screening: 'Screening',
  technical_review: 'Technical Review',
  business_review: 'Business Review',
  final_decision: 'Final Decision',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface PipelineFormProps {
  ideaId: string;
  currentStage: PipelineStage;
  history: StageTransitionView[];
  /** Present when idea is in awaiting_clarification — the open clarification id */
  activeClarificationId?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PipelineForm({
  ideaId,
  currentStage,
  history,
  activeClarificationId,
}: PipelineFormProps) {
  const isFinal = currentStage === 'final_decision';
  const nextStage = getNextStage(currentStage);

  const [showClarifyForm, setShowClarifyForm] = useState(false);

  const advanceAction = isFinal ? approveAtFinalDecision : advanceStage;
  const [advanceState, dispatchAdvance, isPending] = useActionState<
    PipelineActionResult | null,
    FormData
  >(advanceAction, null);

  const [rejectState, dispatchReject, isRejectPending] = useActionState<
    PipelineActionResult | null,
    FormData
  >(rejectAtStage, null);

  const [clarifyState, dispatchClarify] = useActionState<
    PipelineActionResult | null,
    FormData
  >(requestClarification, null);

  const [cancelState, dispatchCancel] = useActionState<
    PipelineActionResult | null,
    FormData
  >(cancelClarification, null);

  // Derive current error / conflict message
  const errorState = advanceState ?? rejectState ?? clarifyState ?? cancelState;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {errorState?.conflict && (
        <div role="alert" aria-live="polite" className="rounded border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-800">
          This idea has already been moved by another reviewer. Please refresh the page.
        </div>
      )}
      {errorState?.error && (
        <div role="alert" aria-live="polite" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {errorState.error}
        </div>
      )}

      {/* Stage history */}
      {history.length > 0 && (
        <section aria-label="stage history">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Review History</h3>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <span className="font-medium">{STAGE_LABELS[h.stage as PipelineStage] ?? h.stage}</span>
                {' — '}{h.action}{' by '}{h.adminDisplayName}
                <p className="mt-1 text-neutral-600">{h.notes}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Advance / Approve form */}
      <form action={dispatchAdvance} className="space-y-4">
        <input type="hidden" name="ideaId" value={ideaId} />
        <input type="hidden" name="expectedStatus" value={currentStage} />

        <div>
          <Label htmlFor="notes">
            {isFinal ? 'Decision Notes' : `${STAGE_LABELS[currentStage]} Notes`}{' '}
            <span aria-hidden="true" className="text-red-500">*</span>
          </Label>
          <Textarea
            id="notes"
            name="notes"
            required
            maxLength={2000}
            rows={4}
            placeholder="Enter your review notes here…"
            className="mt-1"
          />
        </div>

        <ScoringPanel />

        <div className="flex gap-3 flex-wrap">
          {isFinal ? (
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Approving…' : 'Approve'}
            </Button>
          ) : (
            nextStage && (
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Advancing…'
                  : `Advance to ${STAGE_LABELS[nextStage]}`}
              </Button>
            )
          )}
        </div>
      </form>

      {/* Reject form */}
      <form action={dispatchReject} className="space-y-3 border-t border-neutral-200 pt-4">
        <input type="hidden" name="ideaId" value={ideaId} />
        <input type="hidden" name="expectedStatus" value={currentStage} />
        <div>
          <Label htmlFor="reject-notes">
            Rejection Reason <span aria-hidden="true" className="text-red-500">*</span>
          </Label>
          <Textarea
            id="reject-notes"
            name="notes"
            required
            maxLength={2000}
            rows={3}
            placeholder="State the reason for rejection…"
            className="mt-1"
          />
        </div>
        <ScoringPanel namePrefix="score" />
        <Button type="submit" variant="destructive" disabled={isRejectPending}>
          {isRejectPending ? 'Rejecting…' : 'Reject'}
        </Button>
      </form>

      {/* Request Clarification */}
      {!isFinal && !activeClarificationId && (
        <div className="border-t border-neutral-200 pt-4">
          {!showClarifyForm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClarifyForm(true)}
            >
              Request Clarification
            </Button>
          ) : (
            <form action={dispatchClarify} className="space-y-3">
              <input type="hidden" name="ideaId" value={ideaId} />
              <input type="hidden" name="expectedStatus" value={currentStage} />
              <div>
                <Label htmlFor="clarify-question">
                  Question for Submitter <span aria-hidden="true" className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="clarify-question"
                  name="question"
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder="What information do you need from the submitter?"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clarify-notes">
                  Internal Notes <span aria-hidden="true" className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="clarify-notes"
                  name="notes"
                  required
                  maxLength={2000}
                  rows={2}
                  placeholder="Internal review notes for the audit trail…"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Send Clarification Request</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClarifyForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Cancel Clarification (when awaiting_clarification) */}
      {activeClarificationId && (
        <form action={dispatchCancel} className="space-y-3 border-t border-neutral-200 pt-4">
          <input type="hidden" name="ideaId" value={ideaId} />
          <input type="hidden" name="clarificationId" value={activeClarificationId} />
          <p className="text-sm text-neutral-600">
            This idea is currently awaiting clarification from the submitter.
          </p>
          <div>
            <Label htmlFor="cancel-notes">
              Cancellation Reason <span aria-hidden="true" className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancel-notes"
              name="notes"
              required
              maxLength={2000}
              rows={2}
              placeholder="Why are you cancelling this clarification request?"
              className="mt-1"
            />
          </div>
          <Button type="submit" variant="outline">
            Cancel Clarification
          </Button>
        </form>
      )}
    </div>
  );
}
