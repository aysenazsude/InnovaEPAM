'use client';

import { SCORING_DIMENSIONS } from '@/lib/constants';

interface ScoringPanelProps {
  /** Optional prefix for input names. Defaults to 'score'. */
  namePrefix?: string;
}

export function ScoringPanel({ namePrefix = 'score' }: ScoringPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Evaluation Scores (optional)</h3>
      {SCORING_DIMENSIONS.map(({ key, label }) => (
        <fieldset key={key} aria-label={label}>
          <legend className="mb-1 text-sm font-medium text-gray-600">{label}</legend>
          <div className="flex gap-4">
            {([1, 2, 3, 4, 5] as const).map((value) => {
              const inputId = `${namePrefix}_${key}_${value}`;
              return (
                <label key={value} htmlFor={inputId} className="flex items-center gap-1 cursor-pointer">
                  <input
                    id={inputId}
                    type="radio"
                    name={`${namePrefix}_${key}`}
                    value={String(value)}
                    aria-label={String(value)}
                    className="cursor-pointer"
                  />
                  {value}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
