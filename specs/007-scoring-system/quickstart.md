# Quickstart: Scoring System (Feature 007)

**Branch**: `007-scoring-system`  
**Date**: 2026-05-15

A developer guide for implementing and testing the scoring system locally.

---

## Prerequisites

- Node.js 20+, npm 10+
- Existing dev environment working (`npm run dev` → `http://localhost:3000`)
- SQLite DB at `data/innovatepam.db` (created by existing migrations)

---

## 1. Apply the DB Migration

After creating `src/lib/db/migrations/0005_scoring_evaluation.sql` and updating `schema.ts`:

```bash
# Validate the schema compiles
npx tsc --noEmit

# Push migration to local DB (Drizzle Kit)
npx drizzle-kit migrate
```

Verify the table exists:

```bash
sqlite3 data/innovatepam.db ".schema evaluation_scores"
```

Expected output includes `CREATE TABLE evaluation_scores (...)`.

---

## 2. Run the Dev Server

```bash
npm run dev
```

1. Log in as admin (`admin@example.com` / `AdminPass1` — created by E2E global-setup or manually).
2. Navigate to **Admin Dashboard** → click any pipeline idea → open the **Pipeline Review** page.
3. The **Scoring Panel** (five 1–5 radio-button rows) should appear above the Notes textarea.
4. Select scores, fill in notes, and click **Advance** or **Reject**.
5. After submission, the **Score Summary** card should appear in the review history section.
6. Return to the Admin Dashboard — pipeline ideas with scores show a numeric badge.

---

## 3. Run Tests

```bash
# Unit tests (includes ScoringPanel, ScoreSummaryCard, extractScores, scoringHelpers)
npm run test:unit

# Integration tests (includes scoring write + read, aggregate query)
npm run test:integration

# E2E (requires dev server running)
npm run test:e2e -- --grep "scoring"

# All tests (full gate)
npm run typecheck && npm run lint && npm run test:unit && npm run test:integration
```

---

## 4. Key Files Changed / Added

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add `evaluationScores` table, `ScoringDimension` type, `SCORING_DIMENSION_VALUES` |
| `src/lib/db/migrations/0005_scoring_evaluation.sql` | New migration |
| `src/lib/constants.ts` | Add `SCORING_DIMENSIONS` array |
| `src/lib/pipeline/scoringHelpers.ts` | New: `extractScores()` helper |
| `src/lib/pipeline/pipelineRepository.ts` | Add `insertEvaluationScores`, `getScoreSummary`, `getIdeaAggregateScores` |
| `src/lib/actions/pipeline.ts` | Extend `advanceStage`, `rejectAtStage`, `approveAtFinalDecision` to read + persist scores |
| `src/lib/ideas/anonymize.ts` | Extend `AdminIdeaView` with `aggregateScore?: number`; update `toAdminIdeaView()` |
| `src/components/admin/ScoringPanel.tsx` | New component — 5 dimension radio-button rows |
| `src/components/admin/ScoreSummaryCard.tsx` | New component — score summary display |
| `src/components/admin/PipelineForm.tsx` | Embed `<ScoringPanel>` in advance and reject forms |
| `src/app/(portal)/admin/ideas/[id]/review/page.tsx` | Fetch + pass `ScoreSummary` to `ScoreSummaryCard` |
| `src/app/(portal)/admin/page.tsx` | Fetch aggregate scores, pass to `toAdminIdeaView()` |
| `src/components/admin/AdminIdeaList.tsx` | Render `aggregateScore` badge on pipeline ideas |
| `tests/unit/lib/pipeline/scoringHelpers.test.ts` | New unit tests |
| `tests/unit/components/admin/ScoringPanel.test.tsx` | New unit tests |
| `tests/unit/components/admin/ScoreSummaryCard.test.tsx` | New unit tests |
| `tests/integration/pipeline/scoringPersistence.test.ts` | New integration tests |
| `tests/e2e/ideas/admin-scores-idea.spec.ts` | New E2E test |

---

## 5. Validation Checklist (before PR)

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero warnings on new/modified files
- [ ] `npm run test:unit` — all pass including new scoring unit tests
- [ ] `npm run test:integration` — all pass including new scoring integration tests
- [ ] Scoring panel renders on Screening, Technical Review, Business Review, and Final Decision stages
- [ ] Score outside 1–5 is rejected with validation error (manual test or integration test)
- [ ] Score summary displays correctly after a scored transition
- [ ] Admin list shows numeric badge for scored pipeline ideas and no badge for unscored ideas
- [ ] All existing pipeline tests still pass (no regressions)
