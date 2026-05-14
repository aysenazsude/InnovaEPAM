# Quickstart: Multi-Stage Review — Phase 5

## What Is Being Built

Phase 5 adds a **4-stage pipeline review process** to the InnovaEPAM portal. When an admin starts a pipeline review on a submitted idea, it moves through: `Screening → Technical Review → Business Review → Final Decision`. At any stage, the admin can advance the idea to the next stage, reject it (terminal), or pause review by requesting a clarification from the submitter. The submitter can respond to clarification requests or wait for the admin to cancel them.

---

## Running the App

```bash
npm run dev          # start Next.js dev server
npm run db:migrate   # apply pending schema migrations
```

---

## Running Tests

```bash
npm run test:unit        # run all unit tests
npm run test:integration # run all integration tests
npx playwright test      # run all E2E tests
```

---

## New Source Files (Phase 5)

| File | Description |
|------|-------------|
| `src/lib/db/schema.ts` | Extended with `stageTransitions`, `clarificationRequests` tables and new `IdeaStatus` values |
| `src/lib/db/migrations/XXXX_*.sql` | Migration: adds `stage_transitions`, `clarification_requests` tables and `active_clarification_id` to `ideas` |
| `src/lib/ideas/pipelineMachine.ts` | State machine for 4-stage pipeline transitions |
| `src/lib/pipeline/pipelineValidator.ts` | Validates notes, question, response inputs for pipeline actions |
| `src/lib/pipeline/pipelineRepository.ts` | Drizzle queries: `insertStageTransition`, `getStageTransitions`, `insertClarificationRequest`, `getPendingClarification`, `resolveClarification`, `cancelClarification`, `getPipelineCounts` |
| `src/lib/actions/pipeline.ts` | Server actions: `startPipelineReview`, `advanceStage`, `approveAtFinalDecision`, `rejectAtStage`, `requestClarification`, `cancelClarification`, `respondToClarification`, `getPipelineHistory`, `getPipelineCounts` |
| `src/components/admin/PipelineForm.tsx` | Admin form for advancing, rejecting, or requesting clarification at any stage |
| `src/components/ideas/PipelineProgress.tsx` | Stepper component showing current pipeline stage for the submitter |
| `src/app/(portal)/admin/ideas/[id]/review/page.tsx` | Admin pipeline review page |
| `src/app/(portal)/ideas/[id]/page.tsx` | Updated: shows `PipelineProgress` for pipeline ideas |
| `src/app/(portal)/admin/ideas/page.tsx` | Updated: stage filter tabs + pipeline count banner |

---

## New Test Files (Phase 5)

| File | Type | Description |
|------|------|-------------|
| `tests/unit/lib/ideas/pipelineMachine.test.ts` | Unit | All valid and invalid transitions |
| `tests/unit/lib/pipeline/pipelineValidator.test.ts` | Unit | Notes/question/response validation rules |
| `tests/unit/components/admin/PipelineForm.test.tsx` | Unit | Form rendering, action invocation, conflict message |
| `tests/unit/components/ideas/PipelineProgress.test.tsx` | Unit | Step rendering for each stage |
| `tests/integration/pipeline/advanceStage.test.ts` | Integration | Happy path, conflict, invalid transition |
| `tests/integration/pipeline/rejectAtStage.test.ts` | Integration | Reject at each stage |
| `tests/integration/pipeline/clarification.test.ts` | Integration | Request, respond, cancel flows |
| `tests/integration/pipeline/getPipelineHistory.test.ts` | Integration | Full history ordering, actor name |
| `tests/integration/pipeline/getPipelineCounts.test.ts` | Integration | Count grouping by stage |
| `tests/e2e/ideas/admin-reviews-pipeline.spec.ts` | E2E | Full pipeline flow: start → advance × 3 → approve |
| `tests/fixtures/pipeline.ts` | Fixture | Factory functions for `StageTransition`, `ClarificationRequest` |
| `tests/helpers/pipelineHelpers.ts` | Helper | `advanceIdeaToStage(db, ideaId, targetStage)`, `createPendingClarification(db, ideaId)` |

---

## Key Design Decisions

1. **Backward compatible enum extension** — Existing `submitted | under_review | accepted | rejected` values are preserved. New pipeline statuses are additive. Pre-pipeline ideas are unaffected.

2. **`status` as optimistic lock token** — No separate `version` column. The `expectedStatus` field in form data serves as the concurrency token. The action reads current status inside a transaction and returns `{ conflict: true }` if it has changed.

3. **Parallel module structure** — `src/lib/ideas/pipelineMachine.ts` and `src/lib/pipeline/` are new modules. `src/lib/ideas/statusMachine.ts` and `src/lib/actions/evaluation.ts` are not modified.

4. **Event log for audit trail** — Every pipeline action inserts a row into `stage_transitions`. This provides a full, ordered history of who did what and when, required by FR-006.

5. **ClarificationRequest is self-contained** — The `clarification_requests` table stores both paths to resolution (submitter responds OR admin cancels). The idea's `activeClarificationId` acts as a pointer to the single open request.
