import type { ScoringDimension } from '@/lib/constants';
import { SCORING_DIMENSIONS } from '@/lib/constants';

export type DimensionScores = Partial<Record<ScoringDimension, number>>;

/**
 * Extracts and validates 1-5 dimension scores from a FormData object.
 * Expects fields named `score_{dimension}` for each of the five fixed dimensions.
 * Returns `{ scores }` on success (empty object when no score fields present).
 * Returns `{ error }` if any present score value is outside [1, 5] or non-integer.
 */
export function extractScores(
  formData: FormData
): { scores: DimensionScores } | { error: string } {
  const scores: DimensionScores = {};

  for (const { key } of SCORING_DIMENSIONS) {
    const raw = formData.get(`score_${key}`);
    if (raw === null || raw === '') continue;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return { error: `Score for "${key}" must be a whole number between 1 and 5.` };
    }

    scores[key] = parsed;
  }

  return { scores };
}
