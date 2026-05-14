# Contract: Scoring API (Feature 007)

**Type**: TypeScript internal contract — server actions + repository interfaces  
**Date**: 2026-05-15  
**Research basis**: research.md — Unknown 3 (form data), Unknown 4 (aggregate), Unknown 6 (immutability)

---

## Constants

```typescript
// src/lib/constants.ts (additions)

export const ANONYMOUS_SUBMITTER_LABEL = 'Anonymous Submitter'; // already exists

export const SCORING_DIMENSIONS = [
  { key: 'innovation',           label: 'Innovation' },
  { key: 'feasibility',          label: 'Feasibility' },
  { key: 'business_impact',      label: 'Business Impact' },
  { key: 'strategic_alignment',  label: 'Strategic Alignment' },
  { key: 'technical_soundness',  label: 'Technical Soundness' },
] as const satisfies ReadonlyArray<{ key: ScoringDimension; label: string }>;

export type ScoringDimension =
  | 'innovation'
  | 'feasibility'
  | 'business_impact'
  | 'strategic_alignment'
  | 'technical_soundness';
```

---

## Form Data Contract (Server Actions)

All three existing stage actions — `advanceStage`, `rejectAtStage`, `approveAtFinalDecision` — receive optional score fields in `FormData` alongside the existing `ideaId`, `expectedStatus`, and `notes` fields.

### Optional score fields (per FormData submission)

| Field name | Type | Valid values | Notes |
|------------|------|-------------|-------|
| `score_innovation` | string \| null | `"1"` – `"5"` or absent | Absent means no score for this dimension |
| `score_feasibility` | string \| null | `"1"` – `"5"` or absent | |
| `score_business_impact` | string \| null | `"1"` – `"5"` or absent | |
| `score_strategic_alignment` | string \| null | `"1"` – `"5"` or absent | |
| `score_technical_soundness` | string \| null | `"1"` – `"5"` or absent | |

**Validation rules**:
- If present: must parse to an integer in [1, 5]. Any other value returns `{ error: 'Score must be between 1 and 5' }` and aborts the action.
- If absent: the dimension is skipped silently (scoring is advisory).
- All five absent: valid submission — no scores are written.

### Extracted helper type

```typescript
// src/lib/pipeline/scoringHelpers.ts
export type DimensionScores = Partial<Record<ScoringDimension, number>>;

/**
 * Extracts and validates dimension scores from FormData.
 * Returns { scores } on success or { error } on invalid input.
 */
export function extractScores(
  formData: FormData
): { scores: DimensionScores } | { error: string };
```

---

## Repository Contract

```typescript
// Additions to src/lib/pipeline/pipelineRepository.ts

/**
 * Inserts evaluation score rows for a completed stage transition.
 * Called inside the same DB transaction as the transition insertion.
 * No-op if scores is empty.
 */
export function insertEvaluationScores(
  input: {
    transitionId: string;
    ideaId: string;
    adminId: string;
    scores: DimensionScores;
    createdAt: number;
  },
  db: DB
): void;

/**
 * Returns a full score summary for one idea: per-stage dimension scores,
 * per-stage average, and overall average. Returns null values where no scores exist.
 */
export async function getScoreSummary(
  ideaId: string,
  db: DB
): Promise<ScoreSummary>;

/**
 * Returns aggregate average scores for a set of idea IDs.
 * Only ideas that have at least one score are included in the result.
 * Used by the admin list RSC.
 */
export async function getIdeaAggregateScores(
  ideaIds: string[],
  db: DB
): Promise<IdeaAggregateScore[]>;
```

---

## Component Contract

### `ScoringPanel`

```typescript
// src/components/admin/ScoringPanel.tsx
interface ScoringPanelProps {
  /** Prefix for input name attributes, e.g. "score" → inputs named "score_innovation" etc. */
  namePrefix?: string; // default: "score"
}

// Renders 5 dimension rows, each with radio buttons 1–5.
// All inputs are optional (no `required` attribute).
// Compatible with both advanceStage and rejectAtStage forms via namePrefix.
export function ScoringPanel(props: ScoringPanelProps): JSX.Element;
```

### `ScoreSummaryCard`

```typescript
// src/components/admin/ScoreSummaryCard.tsx
interface ScoreSummaryCardProps {
  summary: ScoreSummary;
}

// Renders a card with:
//   - Per-stage rows showing dimension scores and stage average
//   - Overall average at the bottom
//   - Empty-state message if summary has no scores
export function ScoreSummaryCard(props: ScoreSummaryCardProps): JSX.Element;
```

---

## `AdminIdeaView` Extension

```typescript
// src/lib/ideas/anonymize.ts
// Existing: AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'>
// Extended (Feature 007):
export type AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'> & {
  aggregateScore?: number; // undefined = no scores yet
};
```

The `toAdminIdeaView()` function is updated to accept an optional `aggregateScore` argument:

```typescript
export function toAdminIdeaView(
  idea: IdeaWithAttachments,
  aggregateScore?: number
): AdminIdeaView;
```
