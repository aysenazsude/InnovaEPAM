# Tasks: Multi-Stage Review — Phase 5

**Input**: Design documents from `specs/005-multi-stage-review/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/review-pipeline-api.md ✅

**Tests**: Included — TDD mandatory per Constitution Principle IV (RED-GREEN-REFACTOR cycle; tests written before implementation).

**Organization**: Tasks grouped by user story. Each phase is independently testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no inter-dependencies)
- **[Story]**: User story this task belongs to (US1–US4)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema extension, migration, and shared test infrastructure. All subsequent phases depend on this phase.

- [X] T001 Extend `IdeaStatus` enum and add `stageTransitions` + `clarificationRequests` tables in `src/lib/db/schema.ts` — add `active_clarification_id` nullable FK to `ideas` table; add 6 new status values; define `PipelineStage`, `PipelineAction`, `StageTransition`, `NewStageTransition`, `ClarificationRequest`, `NewClarificationRequest` types
- [X] T002 Generate and apply DB migration: `npm run db:generate` then `npm run db:migrate` — verify `specs/005-multi-stage-review/data-model.md` schema matches generated SQL in `src/lib/db/migrations/`
- [X] T003 [P] Create `tests/fixtures/pipeline.ts` — export `createStageTransition(ideaId, adminId, overrides?)`, `createClarificationRequest(ideaId, adminId, overrides?)`, `createStageTransitionView(overrides?)` factory functions using safe defaults
- [X] T004 [P] Create `tests/helpers/pipelineHelpers.ts` — export `advanceIdeaToStage(db, ideaId, adminId, targetStage)` helper that inserts the required `stage_transitions` rows and updates `ideas.status`, and `createPendingClarification(db, ideaId, adminId)` that inserts a `clarification_requests` row and sets `ideas.status` to `awaiting_clarification`

**Checkpoint**: Schema migrated; test infrastructure in place — foundational phase can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure-logic modules that all user story phases depend on. No DB access; no Next.js dependencies.

**⚠️ CRITICAL**: All user story phases depend on T005, T006, T007. Complete before starting Phase 3.

- [X] T005 [P] Create `src/lib/ideas/pipelineMachine.ts` — export `PIPELINE_STAGES: readonly PipelineStage[]`, `PIPELINE_TRANSITIONS: Record<PipelineStage, PipelineStage | null>`, `pipelineTransition(current: IdeaStatus, next: IdeaStatus): void` (throws on invalid), `getNextStage(stage: PipelineStage): PipelineStage | null`, `isPipelineStatus(status: IdeaStatus): boolean`, `PIPELINE_TERMINAL_ACTIONS` constant
- [X] T006 [P] Create `src/lib/pipeline/pipelineValidator.ts` — export `validateNotes(notes: string): { valid: boolean; error?: string }` (1–2000 chars), `validateQuestion(q: string): { valid: boolean; error?: string }` (1–1000 chars), `validateResponse(r: string): { valid: boolean; error?: string }` (1–2000 chars)
- [X] T007 Create `src/lib/pipeline/pipelineRepository.ts` — export `insertStageTransition(input: NewStageTransition, db: DB)`, `getStageTransitions(ideaId: string, db: DB): Promise<StageTransitionView[]>` (JOIN users for `adminDisplayName`), `insertClarificationRequest(input: NewClarificationRequest, db: DB)`, `getPendingClarification(ideaId: string, db: DB): Promise<ClarificationRequest | null>`, `resolveClarification(id: string, responderId: string, response: string, db: DB)`, `cancelClarification(id: string, cancelledById: string, db: DB)`, `getPipelineCounts(db: DB): Promise<PipelineCounts>`

**Checkpoint**: Core logic modules ready — all user story phases can now proceed.

---

## Phase 3: User Story 1 — Admin Advances Through Review Stages (Priority: P1) 🎯 MVP

**Goal**: Admin can start pipeline review, advance an idea through all 4 stages with mandatory notes, approve or reject at any stage, and the system enforces single-reviewer conflict protection.

**Independent Test**: Log in as admin → open a `submitted` idea → click "Start Pipeline Review" → enter Screening notes → advance → enter Technical Review notes → advance → enter Business Review notes → advance → enter Final Decision notes → click "Approve" → verify idea shows `approved` status and all 4 stage notes are stored in `stage_transitions`.

### Tests for User Story 1 ⚠️ Write FIRST — ensure RED before implementing T013–T017

- [X] T008 [P] [US1] Write unit tests in `tests/unit/lib/ideas/pipelineMachine.test.ts` — cover: valid transitions (submitted→screening, screening→technical_review, technical_review→business_review, business_review→final_decision, final_decision→approved), invalid transitions (submitted→technical_review, final_decision→screening), `getNextStage` returns null at final_decision, `isPipelineStatus` returns true/false correctly
- [X] T009 [P] [US1] Write unit tests in `tests/unit/lib/pipeline/pipelineValidator.test.ts` — cover: empty notes → invalid, notes exactly 1 char → valid, notes 2001 chars → invalid, question exactly 1000 chars → valid, question 1001 chars → invalid, whitespace-only notes → invalid
- [X] T010 [US1] Write integration tests in `tests/integration/pipeline/advanceStage.test.ts` — cover: `startPipelineReview` sets status to `screening` and inserts transition row; `advanceStage` happy path (screening→technical_review) persists notes and new status; `advanceStage` with empty notes returns `{ error: 'Notes are required' }`; `advanceStage` conflict (expectedStatus stale) returns `{ conflict: true }`; `approveAtFinalDecision` sets status `approved` and sets `evaluatedAt`; unauthenticated call redirects to `/login`; non-admin call redirects to `/ideas`
- [X] T011 [P] [US1] Write integration tests in `tests/integration/pipeline/rejectAtStage.test.ts` — cover: reject at `screening` sets status to `rejected` and records stage-at-rejection; reject at `final_decision` sets status to `rejected`; reject with empty notes returns `{ error: 'Notes are required' }`; conflict on reject returns `{ conflict: true }`
- [X] T012 [P] [US1] Write integration tests in `tests/integration/pipeline/getPipelineHistory.test.ts` — cover: returns empty array for idea with no transitions; returns transitions in ascending `createdAt` order; `adminDisplayName` is populated from JOIN; submitter can fetch history of own idea; submitter cannot fetch history of another user's idea (returns `{ error: 'Not authorized' }`)

### Implementation for User Story 1

- [X] T013 [US1] Implement `startPipelineReview`, `advanceStage`, `approveAtFinalDecision`, `rejectAtStage` server actions in `src/lib/actions/pipeline.ts` — each uses `requireAdmin()` guard, `validateNotes`, `pipelineTransition`, and a `dbInstance.transaction` with conflict check (`idea.status !== expectedStatus → { conflict: true }`); each inserts a `stageTransitions` row and calls `revalidatePath('/admin/ideas')`
- [X] T014 [US1] Implement `getPipelineHistory` server action in `src/lib/actions/pipeline.ts` — auth check allows admin (any idea) or submitter (own idea only); calls `pipelineRepository.getStageTransitions`
- [X] T015 [P] [US1] Write unit tests in `tests/unit/components/admin/PipelineForm.test.tsx` — cover: renders advance button and notes textarea; renders "Approve" and "Reject" (not "Advance") when `currentStage === 'final_decision'`; shows conflict error message when `state.conflict === true`; notes textarea is required; form calls `advanceStage` via `useActionState` on submit
- [X] T016 [US1] Create `src/components/admin/PipelineForm.tsx` — client component accepting `ideaId: string`, `currentStage: PipelineStage`, `history: StageTransitionView[]`; renders notes `<textarea required>`; hidden `expectedStatus` input; advance/approve/reject buttons; conflict and error `aria-live` banner; uses `useActionState` with `advanceStage` / `approveAtFinalDecision` / `rejectAtStage`
- [X] T017 [US1] Create `src/app/(portal)/admin/ideas/[id]/review/page.tsx` — server component; requires admin session (redirect to `/login` if not); fetches idea by `params.id`; calls `notFound()` if idea not in pipeline status; fetches `getPipelineHistory`; renders `PipelineForm` and stage history list; link back to `/admin/ideas`

**Checkpoint**: US1 fully functional — admin can drive an idea through all 4 stages independently.

---

## Phase 4: User Story 2 — Submitter Tracks Review Progress (Priority: P2)

**Goal**: Submitter sees a 4-step visual pipeline progress indicator on their idea detail page, with completed stage notes and rejection reasons visible.

**Independent Test**: Log in as submitter → open an idea at `technical_review` → verify 4-step stepper shows Stage 1 complete, Stage 2 active, Stages 3–4 pending → verify Stage 1 notes are readable → verify Stage 2 has no notes shown yet.

### Tests for User Story 2 ⚠️ Write FIRST

- [X] T018 [P] [US2] Write unit tests in `tests/unit/components/ideas/PipelineProgress.test.tsx` — cover: renders all 4 stage labels; step before current stage shows "completed" indicator; current stage shows "active" indicator; stages after current show "pending"; accepted stages display reviewer notes; rejected idea shows rejection reason and stage-at-rejection; non-pipeline idea (status `submitted`) shows all stages as pending with "queued" message

### Implementation for User Story 2

- [X] T019 [US2] Create `src/components/ideas/PipelineProgress.tsx` — client component accepting `currentStatus: IdeaStatus`, `history: StageTransitionView[]`; renders horizontal 4-step stepper using Tailwind; each step shows stage name and, if completed, the reviewer's name, date, and notes; shows "Rejected at [stage]" with reason when `status === 'rejected'`; shows "Approved ✓" when `status === 'approved'`; responsive (stacked on mobile)
- [X] T020 [US2] Update `src/app/(portal)/ideas/[id]/page.tsx` — fetch `getPipelineHistory(ideaId)` when `idea.status` is a pipeline status (use `isPipelineStatus`); render `<PipelineProgress>` above the idea body; for non-pipeline ideas (Phase 1 statuses) render existing evaluation display unchanged; submitter access guard unchanged

**Checkpoint**: US2 fully functional — submitter can track progress independently of US1 admin UI.

---

## Phase 5: User Story 3 — Admin Filters by Stage (Priority: P3)

**Goal**: Admin dashboard shows per-stage idea counts in a banner and supports stage filtering via URL query parameter `?stage=`.

**Independent Test**: Seed 3 ideas in `screening`, 2 in `technical_review` → open `/admin/ideas?stage=screening` → verify 3 ideas shown → verify pipeline count banner shows `screening: 3, technical_review: 2`.

### Tests for User Story 3 ⚠️ Write FIRST

- [X] T021 [P] [US3] Write integration tests in `tests/integration/pipeline/getPipelineCounts.test.ts` — cover: returns zeros when no pipeline ideas; counts only ideas with pipeline statuses; `awaiting_clarification` counted separately; non-pipeline statuses (`submitted`, `under_review`, `accepted`, `rejected`) excluded from counts

### Implementation for User Story 3

- [X] T022 [US3] Implement `getPipelineCounts` server action in `src/lib/actions/pipeline.ts` — requires admin; calls `pipelineRepository.getPipelineCounts`; returns `PipelineCounts` object with keys `screening`, `technical_review`, `business_review`, `final_decision`, `awaiting_clarification`
- [X] T023 [US3] Update `src/app/(portal)/admin/ideas/page.tsx` — read `?stage` search param; pass to existing idea fetch (add `WHERE status = ?` when stage param present); render pipeline count banner above idea list using `getPipelineCounts`; render stage-filter tab strip (All | Screening | Technical Review | Business Review | Final Decision) with active tab highlighted; empty-state message when no ideas at selected stage

**Checkpoint**: US3 fully functional — admin can filter and monitor pipeline load independently.

---

## Phase 6: User Story 4 — Clarification Request Flow (Priority: P4)

**Goal**: Admin can pause review to request clarification from the submitter; submitter responds; idea resumes at original stage. Admin can also cancel the clarification request.

**Independent Test**: Admin marks idea "Awaiting Clarification" with a question → submitter logs in, sees question, submits response → admin logs back in, idea is back at original stage with response in history → separately test admin cancels request before submitter responds → idea returns to original stage.

### Tests for User Story 4 ⚠️ Write FIRST

- [X] T024 [P] [US4] Write integration tests in `tests/integration/pipeline/clarification.test.ts` — cover: `requestClarification` sets status to `awaiting_clarification` and sets `activeClarificationId`; `requestClarification` with empty question returns `{ error: 'Question is required' }`; `respondToClarification` reverts status to `stageWhenRequested` and clears `activeClarificationId`; `cancelClarification` by admin reverts status and clears `activeClarificationId`; `respondToClarification` by a different user returns `{ error: 'Not authorized' }`; attempting `requestClarification` on an already-awaiting idea returns error

### Implementation for User Story 4

- [X] T025 [US4] Implement `requestClarification` server action in `src/lib/actions/pipeline.ts` — requires admin; validates `question` (1–1000 chars) and `notes` (1–2000 chars); transaction: conflict check, insert `clarificationRequests` row, update `ideas.status → awaiting_clarification` and `ideas.activeClarificationId`, insert `stageTransitions` row
- [X] T026 [US4] Implement `cancelClarification` and `respondToClarification` server actions in `src/lib/actions/pipeline.ts` — `cancelClarification`: admin only, loads pending request, sets `cancelledAt`/`cancelledById`, reverts `ideas.status` to `stageWhenRequested`, clears `activeClarificationId`, inserts transition row; `respondToClarification`: submitter only (verified against `idea.submitterId`), validates response (1–2000 chars), sets `response`/`responderId`/`respondedAt`, reverts status, clears `activeClarificationId`, inserts transition row
- [X] T027 [US4] Extend `src/components/admin/PipelineForm.tsx` — add "Request Clarification" button that reveals a question `<textarea>`; when `currentStatus === 'awaiting_clarification'` hide advance/reject buttons and show "Cancel Clarification" button with notes field; pass `clarificationId` as hidden input to cancel action
- [X] T028 [US4] Extend `src/app/(portal)/ideas/[id]/page.tsx` — when `idea.status === 'awaiting_clarification'` and `idea.submitterId === session.user.id`: load pending clarification via `getPendingClarification`; render the admin's question prominently; render a response `<textarea>` with submit button wired to `respondToClarification` via `useActionState`; hide idea-submit action while clarification is pending

**Checkpoint**: US4 fully functional — complete clarification lifecycle (request → respond or cancel) works independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E coverage, stale-clarification flag (SC-005), and final quality validation.

- [X] T029 [P] Create E2E test `tests/e2e/ideas/admin-reviews-pipeline.spec.ts` — two scenarios: (1) full happy path: admin starts pipeline review → advances through all 4 stages with notes → approves → verifies submitter sees "Approved" with all stage notes; (2) reject path: admin starts pipeline review → enters Screening notes → clicks Reject → verifies idea shows "Rejected" on both admin and submitter views
- [X] T030 [P] Add 7-day stale clarification visual flag to `src/app/(portal)/admin/ideas/page.tsx` (SC-005) — for ideas with `status === 'awaiting_clarification'` where `requestedAt < now - 7 days`, render a warning badge (e.g., "⚠ Stale") on the idea row; compute `staleCutoff = Math.floor(Date.now() / 1000) - 7 * 24 * 3600` server-side
- [X] T031 Run `npm run typecheck` and `npm run lint` — resolve any TypeScript strict errors or ESLint warnings introduced by Phase 5 changes across all new and modified files

---

## Dependencies (Story Completion Order)

```
Phase 1 (Setup: T001–T004)
    │
    └── Phase 2 (Foundational: T005–T007)
            │
            ├── Phase 3 (US1: T008–T017)  ← MVP delivery point
            │       │
            │       ├── Phase 4 (US2: T018–T020)   ← Reads US1 data
            │       │
            │       └── Phase 5 (US3: T021–T023)   ← Reads US1 data
            │               │
            │               └── Phase 6 (US4: T024–T028)  ← Extends US1 pipeline
            │
            └── Phase 7 (Polish: T029–T031)  ← After all stories complete
```

**Stories are independent at runtime**: US2 (submitter view) and US3 (admin filter) only need US1 data to exist. US4 (clarification) builds on US1 infrastructure.

---

## Parallel Execution Opportunities per Phase

### Phase 1
- T003 ‖ T004 (fixtures and helpers are independent files)

### Phase 2
- T005 ‖ T006 (pipelineMachine and pipelineValidator are independent pure-logic modules)
- T007 depends on T005 and T006 types being stable

### Phase 3 (US1)
- T008 ‖ T009 (unit tests for independent modules)
- T010 ‖ T011 ‖ T012 (three independent integration test files)
- T015 ‖ T013/T014 (component unit test file independent of action implementation, once contracts are known from T010)

### Phase 4, 5, 6
- T018 (PipelineProgress unit test) can start once T008 establishes pipeline stage constants
- T021 (getPipelineCounts test) independent of US2
- T024 (clarification test) independent of US2 and US3

### Phase 7
- T029 ‖ T030 (E2E test and stale-flag feature are independent)

---

## Implementation Strategy

### MVP Scope (deliver first — T001–T017)
Complete Phases 1–3 only. This delivers a fully functional admin pipeline: start review, advance through 4 stages, approve or reject, conflict protection. No submitter-facing UI yet.

### Increment 2 (T018–T020)
Add submitter progress tracking — no new DB writes, only reads from US1 data.

### Increment 3 (T021–T023)
Add admin dashboard stage filter — one new server action, one page update.

### Increment 4 (T024–T028)
Add clarification request/respond/cancel lifecycle.

### Increment 5 (T029–T031)
E2E coverage, stale-flag polish, type/lint validation.

---

## Task Summary

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| 1 — Setup | — | T001–T004 | 4 |
| 2 — Foundational | — | T005–T007 | 3 |
| 3 — Implementation | US1 (P1) | T008–T017 | 10 |
| 4 — Implementation | US2 (P2) | T018–T020 | 3 |
| 5 — Implementation | US3 (P3) | T021–T023 | 3 |
| 6 — Implementation | US4 (P4) | T024–T028 | 5 |
| 7 — Polish | — | T029–T031 | 3 |
| **Total** | | | **31** |

**Parallel opportunities**: 12 tasks marked `[P]`
**Independent test criteria**: Each story phase has a documented manual verification path
**Suggested MVP scope**: Phases 1–3 (T001–T017, 17 tasks)
