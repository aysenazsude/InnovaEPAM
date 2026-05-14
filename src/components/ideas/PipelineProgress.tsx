import { PIPELINE_STAGES } from '@/lib/ideas/pipelineMachine';
import type { PipelineStage } from '@/lib/ideas/pipelineMachine';
import type { StageTransitionView } from '@/lib/pipeline/pipelineRepository';
import type { IdeaStatus } from '@/lib/db/schema';

const STAGE_LABELS: Record<PipelineStage, string> = {
  screening: 'Screening',
  technical_review: 'Technical Review',
  business_review: 'Business Review',
  final_decision: 'Final Decision',
};

interface PipelineProgressProps {
  currentStatus: IdeaStatus;
  history: StageTransitionView[];
}

export function PipelineProgress({ currentStatus, history }: PipelineProgressProps) {
  // Determine how far we are in the pipeline
  const currentStageIndex = PIPELINE_STAGES.indexOf(currentStatus as PipelineStage);

  return (
    <section aria-label="pipeline progress" className="space-y-4">
      {/* Stage stepper */}
      <nav className="flex items-start gap-0" aria-label="pipeline stages">
        {PIPELINE_STAGES.map((stage, i) => {
          const isCompleted = currentStageIndex > i ||
            currentStatus === 'approved' ||
            currentStatus === 'rejected';
          const isCurrent = currentStatus === stage;

          return (
            <div key={stage} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold
                    ${isCompleted ? 'border-green-600 bg-green-100 text-green-700'
                      : isCurrent ? 'border-blue-600 bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                      : 'border-neutral-300 bg-white text-neutral-400'}`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      currentStageIndex > i || currentStatus === 'approved' || currentStatus === 'rejected'
                        ? 'bg-green-400'
                        : 'bg-neutral-200'
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-1 text-center text-xs
                  ${isCurrent ? 'font-semibold text-blue-700' : isCompleted ? 'text-green-700' : 'text-neutral-400'}`}
                aria-label={isCurrent ? 'current stage' : undefined}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Terminal state banners */}
      {currentStatus === 'approved' && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          ✓ Your idea has been <strong>approved</strong>! Congratulations.
        </div>
      )}
      {currentStatus === 'rejected' && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Your idea was <strong>rejected</strong>.
        </div>
      )}
      {currentStatus === 'awaiting_clarification' && (
        <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          An admin has requested clarification and is <strong>awaiting clarification</strong> from you.
        </div>
      )}

      {/* Reviewer notes from history */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-700">Review Notes</h4>
          {history.map((entry) => (
            <div
              key={entry.id}
              className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700"
            >
              <p className="font-medium capitalize">{STAGE_LABELS[entry.stage as PipelineStage] ?? entry.stage}</p>
              <p className="mt-1">{entry.notes}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
