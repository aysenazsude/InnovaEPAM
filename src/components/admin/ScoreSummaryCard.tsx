import { SCORING_DIMENSIONS } from '@/lib/constants';
import type { ScoreSummary } from '@/lib/pipeline/pipelineRepository';

const STAGE_LABELS: Record<string, string> = {
  screening: 'Screening',
  technical_review: 'Technical Review',
  business_review: 'Business Review',
  final_decision: 'Final Decision',
};

interface ScoreSummaryCardProps {
  summary: ScoreSummary;
}

export function ScoreSummaryCard({ summary }: ScoreSummaryCardProps) {
  if (summary.byStage.length === 0) {
    return (
      <div className="rounded border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
        No scores yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded border border-neutral-200 bg-white p-4">
      {summary.overallAverage !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-700">Overall Average</span>
          <span className="text-lg font-bold text-blue-600">{summary.overallAverage}</span>
        </div>
      )}

      {summary.byStage.map((stage) => (
        <section key={stage.transitionId} aria-label={STAGE_LABELS[stage.stage] ?? stage.stage}>
          <h4 className="mb-2 text-sm font-semibold text-neutral-600">
            {STAGE_LABELS[stage.stage] ?? stage.stage}
            {stage.stageAverage !== null && (
              <span className="ml-2 font-normal text-blue-500">avg {stage.stageAverage}</span>
            )}
          </h4>
          {Object.keys(stage.scores).length === 0 ? (
            <p className="text-xs text-neutral-400">No dimension scores recorded.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-600">
              {SCORING_DIMENSIONS.map(({ key, label }) => {
                const score = stage.scores[key];
                if (score === undefined) return null;
                return (
                  <li key={key} className="flex justify-between">
                    <span>{label}</span>
                    <span className="font-medium">{score}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
