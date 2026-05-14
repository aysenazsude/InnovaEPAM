# Tasks: Scoring System

**Input**: Design documents from `specs/007-scoring-system/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/scoring-api.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration + shared constants — blocking prerequisites for all user stories

- [X] T001 Add `SCORING_DIMENSIONS` array and `ScoringDimension` type to `src/lib/constants.ts`
- [X] T002 Add `evaluationScores` table, `SCORING_DIMENSION_VALUES`, `EvaluationScore`, and `NewEvaluationScore` types to `src/lib/db/schema.ts`
- [X] T003 Create migration `src/lib/db/migrations/0005_scoring_evaluation.sql` with `CREATE TABLE evaluation_scores` DDL, CHECK constraints (dimension enum, score 1–5), UNIQUE on `(stage_transition_id, dimension)`, and indexes

**Checkpoint**: `npx tsc --noEmit` passes; `npx drizzle-kit migrate` applies cleanly; `sqlite3 data/innovatepam.db ".schema evaluation_scores"` shows the table.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Scoring helper + repository layer — must exist before any UI or server-action work can start

- [X] T004 Write **failing** unit tests for `extractScores()` in `tests/unit/lib/pipeline/scoringHelpers.test.ts`: assert valid scores extracted, absent fields skipped, score 0 / 6 / non-numeric returns `{ error }`, all five absent returns `{ scores: {} }`
- [X] T005 Implement `src/lib/pipeline/scoringHelpers.ts` exporting `extractScores(formData: FormData): { scores: DimensionScores } | { error: string }` — make T004 pass
- [X] T006 Add `insertEvaluationScores(input, db)` to `src/lib/pipeline/pipelineRepository.ts` — inserts one row per provided dimension score inside the caller's transaction
- [X] T007 Add `getScoreSummary(ideaId, db)` to `src/lib/pipeline/pipelineRepository.ts` — returns `ScoreSummary` with per-stage scores, per-stage average (1 dp), and overall average (1 dp); returns null averages when no scores exist
- [X] T008 Add `getIdeaAggregateScores(ideaIds, db)` to `src/lib/pipeline/pipelineRepository.ts` — returns `IdeaAggregateScore[]` (average per idea, only ideas with ≥1 score included)

**Checkpoint**: `npm run test:unit` passes (T004 unit tests green); TypeScript compiles cleanly.

---

## Phase 3: User Story 1 — Admin Scores an Idea at a Pipeline Stage (Priority: P1) 🎯 MVP

**Goal**: Admins see a 1–5 scoring panel on the stage action form for all pipeline stages; submitted scores are persisted atomically with the stage transition.

**Independent Test**: Admin logs in → opens pipeline idea at Screening → fills scores → submits → `evaluation_scores` table has 5 rows linked to the new `stage_transitions` row. Can be verified with an integration test without US2/US3.

### Tests (write first — must FAIL before implementation)

- [X] T009 [P] [US1] Write **failing** unit tests for `ScoringPanel` in `tests/unit/components/admin/ScoringPanel.test.tsx`: renders 5 dimension fieldsets, each with radio buttons 1–5; no `required` attribute on inputs; `name` attributes follow `score_{dimension}` pattern; passes `namePrefix` prop correctly
- [X] T010 [P] [US1] Write **failing** integration tests for score persistence in `tests/integration/pipeline/scoringPersistence.test.ts` (US1 describe block): submit `advanceStage` FormData with all 5 scores → assert 5 rows in `evaluation_scores` linked to the new transition; submit with 0 scores → assert 0 rows; submit with score=6 → assert `{ error }` returned and 0 rows inserted
- [X] T011 [P] [US1] Add score fixture to `tests/fixtures/scores.ts`: factory function `makeEvaluationScore(overrides?)` returning a valid `NewEvaluationScore` object

### Implementation

- [X] T012 [P] [US1] Create `src/components/admin/ScoringPanel.tsx` — client component rendering 5 `<fieldset>` groups (one per dimension), each with `<legend>` label and five `<input type="radio">` buttons (values 1–5, `name="score_{dimension}"`); no required; Tailwind responsive layout
- [X] T013 [US1] Extend `advanceStage` in `src/lib/actions/pipeline.ts` to: (1) call `extractScores(formData)` and return `{ error }` on invalid; (2) call `insertEvaluationScores` inside the existing DB transaction after the `stageTransitions` insert
- [X] T014 [US1] Extend `rejectAtStage` in `src/lib/actions/pipeline.ts` with the same score extraction + persistence pattern as T013
- [X] T015 [US1] Extend `approveAtFinalDecision` in `src/lib/actions/pipeline.ts` with the same score extraction + persistence pattern as T013
- [X] T016 [US1] Embed `<ScoringPanel />` in both the advance form and the reject form inside `src/components/admin/PipelineForm.tsx`

**Checkpoint**: Integration tests for US1 (T010) all pass; `npm run test:unit` passes (T009); admin can submit scores via the UI and rows appear in `evaluation_scores`.

---

## Phase 4: User Story 2 — Admin Views Score Summary for an Idea (Priority: P2)

**Goal**: Pipeline review page shows a `ScoreSummaryCard` with per-stage dimension scores, per-stage averages, and overall average; empty-state message when no scores exist.

**Independent Test**: Admin opens a pipeline review page for an idea that has scored transitions → sees the score summary card. Can be verified with integration test seeding `evaluation_scores` rows directly.

### Tests (write first — must FAIL before implementation)

- [X] T017 [P] [US2] Write **failing** unit tests for `ScoreSummaryCard` in `tests/unit/components/admin/ScoreSummaryCard.test.tsx`: renders per-stage rows, shows dimension scores, shows per-stage average and overall average (1 dp), renders empty-state message when `byStage` has no scores
- [X] T018 [P] [US2] Extend `tests/integration/pipeline/scoringPersistence.test.ts` with US2 describe block: seed two scored transitions → call `getScoreSummary` → assert `byStage` has correct entries, `stageAverage` and `overallAverage` correct to 1 dp; call with idea having no scores → assert all nulls

### Implementation

- [X] T019 [P] [US2] Create `src/components/admin/ScoreSummaryCard.tsx` — server-compatible display component rendering a card with stage rows (dimension → score or "—"), per-stage average, overall average; empty-state `<p>No scores have been recorded yet.</p>` when summary has no scored stages
- [X] T020 [US2] Update `src/app/(portal)/admin/ideas/[id]/review/page.tsx` RSC to call `getScoreSummary(idea.id, db)` and pass the result to `<ScoreSummaryCard summary={summary} />`; render `ScoreSummaryCard` above the pipeline history section

**Checkpoint**: Unit tests for `ScoreSummaryCard` (T017) pass; integration tests for `getScoreSummary` (T018) pass; review page shows score summary for scored ideas and empty state for unscored ones.

---

## Phase 5: User Story 3 — Admin Dashboard Shows Aggregate Score per Idea (Priority: P3)

**Goal**: Each pipeline idea in the admin idea list shows its current aggregate score badge; unscored ideas show no badge.

**Independent Test**: Admin opens `/admin` → pipeline ideas with scores show a numeric score; ideas without scores show no score badge. Verifiable with an integration test seeding scores and checking the admin page data.

### Tests (write first — must FAIL before implementation)

- [X] T021 [P] [US3] Extend `tests/integration/pipeline/scoringPersistence.test.ts` with US3 describe block: seed one idea with scores across two stages → call `getIdeaAggregateScores([ideaId])` → assert average is correct; seed idea with no scores → assert it is absent from result
- [X] T022 [P] [US3] Extend `tests/unit/components/admin/AdminIdeaList.test.tsx`: add test case asserting a pipeline idea with `aggregateScore: 4.2` renders the badge with text `"4.2"`; add test case asserting idea without `aggregateScore` renders no badge

### Implementation

- [X] T023 [US3] Extend `src/lib/ideas/anonymize.ts`: add `aggregateScore?: number` to `AdminIdeaView` type; update `toAdminIdeaView(idea, aggregateScore?)` signature to accept and forward the optional score
- [X] T024 [US3] Update `src/app/(portal)/admin/page.tsx` RSC to call `getIdeaAggregateScores(ideaIds, db)`, build a `Map<ideaId, average>`, and pass the score to `toAdminIdeaView(idea, scoreMap.get(idea.id))` for each idea
- [X] T025 [US3] Update `src/components/admin/AdminIdeaList.tsx` to render an aggregate score badge (e.g. `<span>★ 4.2</span>`) next to the status badge for ideas where `idea.aggregateScore !== undefined`

**Checkpoint**: All three integration test describe blocks in `scoringPersistence.test.ts` pass; admin list shows score badges; existing `AdminIdeaList.test.tsx` tests still pass.

---

## Phase 6: Polish & Quality Gate

**Purpose**: TypeScript + lint + full test suite validation

- [X] T026 [P] Write E2E test `tests/e2e/ideas/admin-scores-idea.spec.ts` (serial): submitter registers + submits → admin opens pipeline review → scoring panel visible with 5 dimension rows → admin selects scores, submits → score summary card appears with recorded scores → admin returns to dashboard → idea shows score badge
- [X] T027 Run `npx tsc --noEmit` — fix any type errors before merging
- [X] T028 Run `npm run lint` — fix any warnings in new or modified files before merging
- [X] T029 Run `npm run test:unit && npm run test:integration` — all suites green including new scoring tests, zero regressions in existing pipeline/evaluation tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (constants + schema must exist for helpers + repository)
- **Phase 3 (US1)**: Depends on Phase 2 — tests (T009–T011) can be written in parallel with Phase 2 implementation
- **Phase 4 (US2)**: Depends on Phase 2 (repository) + Phase 3 (scores must be persisted to display)
- **Phase 5 (US3)**: Depends on Phase 2 (`getIdeaAggregateScores`) + Phase 3 (scores must exist in DB)
- **Phase 6 (Polish)**: Depends on all implementation phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only — independently testable after Phase 3 complete
- **US2 (P2)**: Depends on Phase 2 + US1 (needs persisted scores to display summary)
- **US3 (P3)**: Depends on Phase 2 + US1 (needs persisted scores to compute aggregate); independent of US2

### Within Each Phase

- Test tasks (T009–T011, T017–T018, T021–T022) MUST be written and FAIL before their implementation counterparts
- `scoringHelpers.ts` (T005) must exist before server action changes (T013–T015)
- `insertEvaluationScores` (T006) must exist before T013–T015
- `ScoringPanel.tsx` (T012) must exist before `PipelineForm.tsx` update (T016)

### Parallel Opportunities

- T009, T010, T011 — can be written in parallel (different test files)
- T012, T013, T014, T015 — T012 can be written in parallel with T013–T015 (different files)
- T017, T018 — can be written in parallel (different test files / describe blocks)
- T019, T020 — T019 can be written in parallel with T020 (different files)
- T021, T022 — can be written in parallel

---

## Parallel Example: Phase 3 (US1)

```
# Write tests in parallel (all different files):
T009: tests/unit/components/admin/ScoringPanel.test.tsx
T010: tests/integration/pipeline/scoringPersistence.test.ts (US1 block)
T011: tests/fixtures/scores.ts

# Then implement in parallel where possible:
T012: src/components/admin/ScoringPanel.tsx         ← parallel with T013–T015
T013: src/lib/actions/pipeline.ts (advanceStage)    ← parallel with T012
T014: src/lib/actions/pipeline.ts (rejectAtStage)   ← parallel with T012
T015: src/lib/actions/pipeline.ts (approveAtFinalDecision) ← parallel with T012

# Then (depends on T012):
T016: src/components/admin/PipelineForm.tsx
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T008)
3. Complete Phase 3: US1 (T009–T016)
4. **STOP and VALIDATE**: `npm run test:unit && npm run test:integration` — scoring panel visible, scores persist in DB
5. Demo to stakeholder; US2 and US3 add display features on top

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (constants, schema, helpers, repository)
2. Phase 3 (US1) → Scoring panel + persistence (MVP — core value delivered)
3. Phase 4 (US2) → Score summary on review page
4. Phase 5 (US3) → Aggregate score badge on admin list
5. Phase 6 → Quality gate (typecheck + lint + full test suite)
