# Implementation Plan: Multi-Stage Review — Phase 5

**Branch**: `005-multi-stage-review` | **Date**: 2025-01-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/005-multi-stage-review/spec.md`

## Summary

Phase 5 replaces the single-step evaluation flow with a **4-stage pipeline review**: Screening → Technical Review → Business Review → Final Decision. Admins advance ideas through stages with mandatory notes at each transition, reject at any stage, or pause review with a clarification request. Submitters can track their idea's progress on a visual pipeline stepper and respond to clarification requests. The admin dashboard gains stage-filter tabs and pipeline count badges. All Phase 1–4 ideas and evaluation code are preserved; the pipeline is an additive extension.

**Technical approach**: Extend the `ideas.status` enum in-place; introduce two new tables (`stage_transitions`, `clarification_requests`); add a parallel `pipelineMachine.ts` state machine and `pipeline.ts` server actions; add `PipelineForm.tsx` and `PipelineProgress.tsx` components; update the admin idea detail and submitter idea detail pages.

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Drizzle ORM, better-sqlite3, NextAuth.js, Tailwind CSS  
**Storage**: SQLite at `data/innovatepam.db`; Drizzle migrations in `src/lib/db/migrations/`; `db.transaction((tx) => { ... })` pattern  
**Testing**: Jest 29 + React Testing Library (unit + integration); Playwright (E2E)  
**Target Platform**: Web — Next.js server components + browser client components  
**Project Type**: Full-stack web application (Next.js App Router)  
**Performance Goals**: Sub-2s page loads; pipeline history query < 100ms (SQLite, indexed)  
**Constraints**: Single-reviewer gate per stage (first-write-wins via `expectedStatus` optimistic token); no background jobs; no email notifications; backward compat with all Phase 1–4 ideas and tests  
**Scale/Scope**: Single SQLite instance; small team portal (hundreds to low-thousands of ideas)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Clean Code** — Each new file has a single responsibility (`pipelineMachine.ts` = transitions, `pipelineValidator.ts` = input validation, `pipelineRepository.ts` = DB queries, `pipeline.ts` = server actions). All estimated under 300 lines. `PipelineForm.tsx` and `PipelineProgress.tsx` are separated by role (admin form vs. submitter display). ESLint/TypeScript strict pass enforced in CI.
- [x] **II. Simple & Responsive UI/UX** — `PipelineProgress.tsx` uses Tailwind flexbox for the 4-step stepper; responsive at 320px+ (stacked labels on mobile). `PipelineForm.tsx` follows existing form patterns in `EvaluationForm.tsx`. Semantic HTML (`<nav aria-label="pipeline stages">`, `<form>`) with WCAG 2.1 AA contrast via existing Tailwind palette.
- [x] **III. Minimal Dependencies** — Zero new runtime packages. All pipeline logic uses existing Drizzle ORM, NextAuth, React, and Next.js APIs. No additional `package.json` entries required.
- [x] **IV. Testing Philosophy** — TDD: unit tests for `pipelineMachine.ts` and `pipelineValidator.ts` written first; integration tests for each server action written before the action body; E2E spec skeleton written before UI components. RED-GREEN-REFACTOR cycle enforced per constitution.
- [x] **V. Coverage Requirements** — New pipeline modules are fully unit-testable (pure functions + injected DB). Integration tests exercise every action with real in-memory SQLite via `createTestDb()`. Overall coverage ≥80% line, ≥75% branch maintained. TypeScript strict: zero errors.
- [x] **VI. Test Types & Organization** — Unit: `tests/unit/lib/ideas/pipelineMachine.test.ts`, `tests/unit/lib/pipeline/pipelineValidator.test.ts`, `tests/unit/components/admin/PipelineForm.test.tsx`, `tests/unit/components/ideas/PipelineProgress.test.tsx`. Integration: `tests/integration/pipeline/`. E2E: `tests/e2e/ideas/admin-reviews-pipeline.spec.ts`. 1-to-1 mapping for all unit files.
- [x] **VII. Naming Conventions** — All test files follow `ComponentName.test.ts(x)` and `user-journey.spec.ts` patterns. Describe blocks: `describe('pipelineMachine', ...)`, `describe('advanceStage', ...)`. Test cases: `it('should advance from screening to technical_review when notes provided', ...)`.
- [x] **VIII. Test Anatomy** — AAA in every test. `beforeEach(() => { testDb = createTestDb(); })` for fresh DB isolation. No `beforeAll` in unit tests. Each integration test creates its own idea + admin user. `clearMocks: true` in `jest.config.ts` clears `jest.mock('@/auth')` automatically.
- [x] **IX. Mocking & Test Data** — `@/auth` mocked via `jest.mock('@/auth', () => ({ auth: jest.fn() }))`. `next/navigation` redirect mocked. `next/cache` revalidatePath mocked. Fixtures in `tests/fixtures/pipeline.ts`; helpers in `tests/helpers/pipelineHelpers.ts`. Pipeline repository and machine modules are NOT mocked in integration tests.
- [x] **X. Quality Criteria** — Every test covers one pipeline action/transition. Mutations covered: wrong-stage advance, missing notes, conflict detection, clarification-while-clarification. Stryker run on `src/lib/ideas/pipelineMachine.ts` and `src/lib/pipeline/pipelineValidator.ts` targeting ≥75%.
- [x] **XI. Tools & Frameworks** — All existing `npm run` scripts unchanged. `npm run db:generate && npm run db:migrate` required after schema change. No new scripts or CI steps needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-multi-stage-review/
├── plan.md              # This file
├── research.md          # Phase 0 output — all R-001–R-006 decisions documented
├── data-model.md        # Phase 1 output — schema, state machine, TypeScript types
├── quickstart.md        # Phase 1 output — setup and new file inventory
├── contracts/
│   └── review-pipeline-api.md   # Phase 1 output — all 9 server action contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks — NOT this command)
```

### Source Code (additions for Phase 5)

```text
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts                         # EXTEND: new tables + enum values
│   │   └── migrations/                       # NEW: 0004_*.sql migration
│   ├── ideas/
│   │   └── pipelineMachine.ts                # NEW: 4-stage pipeline state machine
│   ├── pipeline/
│   │   ├── pipelineValidator.ts              # NEW: notes/question/response validation
│   │   └── pipelineRepository.ts            # NEW: Drizzle queries for stage_transitions + clarification_requests
│   └── actions/
│       └── pipeline.ts                       # NEW: 9 server actions (startPipelineReview, advanceStage, ...)
├── components/
│   ├── admin/
│   │   └── PipelineForm.tsx                  # NEW: admin advance/reject/clarify form
│   └── ideas/
│       └── PipelineProgress.tsx              # NEW: 4-step progress stepper (submitter view)
└── app/(portal)/
    ├── admin/
    │   └── ideas/
    │       ├── page.tsx                      # EXTEND: stage-filter tabs + pipeline count banner
    │       └── [id]/
    │           └── review/
    │               └── page.tsx              # NEW: pipeline review page for admins
    └── ideas/
        └── [id]/
            └── page.tsx                      # EXTEND: show PipelineProgress for pipeline ideas

tests/
├── fixtures/
│   └── pipeline.ts                          # NEW: factory functions for StageTransition, ClarificationRequest
├── helpers/
│   └── pipelineHelpers.ts                   # NEW: advanceIdeaToStage(), createPendingClarification()
├── unit/
│   ├── lib/
│   │   ├── ideas/
│   │   │   └── pipelineMachine.test.ts       # NEW: all valid + invalid transitions
│   │   └── pipeline/
│   │       └── pipelineValidator.test.ts     # NEW: notes/question/response validation
│   └── components/
│       ├── admin/
│       │   └── PipelineForm.test.tsx         # NEW: form render, submit, conflict message
│       └── ideas/
│           └── PipelineProgress.test.tsx     # NEW: stepper step rendering per stage
├── integration/
│   └── pipeline/
│       ├── advanceStage.test.ts              # NEW: happy path, conflict, invalid transition
│       ├── rejectAtStage.test.ts             # NEW: reject at each of the 4 stages
│       ├── clarification.test.ts             # NEW: request, respond, cancel flows
│       ├── getPipelineHistory.test.ts        # NEW: full history ordering, actor name
│       └── getPipelineCounts.test.ts         # NEW: count grouping by stage
└── e2e/
    └── ideas/
        └── admin-reviews-pipeline.spec.ts    # NEW: full flow: start → advance ×3 → approve
```

## Complexity Tracking

> No constitution violations. All principles pass — see Constitution Check section above.

---

## Phase 0: Research Findings

All research decisions are fully documented in [research.md](research.md). Summary:

| ID | Topic | Decision |
|----|-------|----------|
| R-001 | Backward compatibility | Extend `ideas.status` enum in-place; preserve all existing values; no existing code modified |
| R-002 | Optimistic concurrency | Use `expectedStatus` as version token inside a DB transaction; return `{ conflict: true }` on mismatch |
| R-003 | Stage transitions audit | Dedicated `stage_transitions` append-only table; one row per pipeline action |
| R-004 | Clarification data model | Separate `clarification_requests` table with nullable `response`, `cancelledAt`, `cancelledById` |
| R-005 | Pipeline dashboard counts | Single `GROUP BY status` query on `ideas` filtered to pipeline statuses |
| R-006 | Existing evaluation code | `statusMachine.ts`, `evaluation.ts`, Phase 1 tests left completely untouched; new pipeline is a parallel module |

---

## Phase 1: Design Summary

Full design artifacts are in [data-model.md](data-model.md), [contracts/review-pipeline-api.md](contracts/review-pipeline-api.md), and [quickstart.md](quickstart.md).

### Schema Changes

**`ideas` table** — two additions:
- `status` enum extended with: `screening`, `technical_review`, `business_review`, `final_decision`, `approved`, `awaiting_clarification`
- `active_clarification_id` TEXT nullable FK → `clarification_requests.id`

**New table: `stage_transitions`**
- `id`, `idea_id`, `stage`, `action`, `notes`, `admin_id`, `created_at`
- Indexes: `(idea_id)`, `(idea_id, created_at DESC)`

**New table: `clarification_requests`**
- `id`, `idea_id`, `stage_when_requested`, `question`, `questioner_id`, `requested_at`
- `response`, `responder_id`, `responded_at` (submitter path)
- `cancelled_at`, `cancelled_by_id` (admin cancel path)

### Pipeline State Machine (pipelineMachine.ts)

```
submitted → screening → technical_review → business_review → final_decision → approved
         ↘           ↘                  ↘                 ↘               ↘
          rejected    rejected            rejected           rejected        (terminal)
           ↕           ↕                  ↕                 ↕
          awaiting_clarification ←→ (stageWhenRequested via respond or cancel)
```

### Server Actions (pipeline.ts)

| Action | Role | Input | Side Effects |
|--------|------|-------|-------------|
| `startPipelineReview` | Admin | `ideaId` | `status→screening`, insert transition |
| `advanceStage` | Admin | `ideaId, expectedStatus, notes` | `status→next`, insert transition (transaction) |
| `approveAtFinalDecision` | Admin | `ideaId, expectedStatus, notes` | `status→approved`, insert transition (transaction) |
| `rejectAtStage` | Admin | `ideaId, expectedStatus, notes` | `status→rejected`, insert transition (transaction) |
| `requestClarification` | Admin | `ideaId, expectedStatus, question, notes` | `status→awaiting_clarification`, insert clarification + transition |
| `cancelClarification` | Admin | `ideaId, clarificationId, notes` | revert status, update clarification, insert transition |
| `respondToClarification` | Submitter | `ideaId, clarificationId, response` | revert status, update clarification, insert transition |
| `getPipelineHistory` | Admin+Submitter | `ideaId` | SELECT with JOIN on users |
| `getPipelineCounts` | Admin | — | `GROUP BY status` on ideas |

### Key Design Decisions

1. **`status` as optimistic lock** — No separate `version` column. `expectedStatus` in form payload compared to DB value inside a transaction. Second concurrent write gets `{ conflict: true }`.

2. **Parallel module structure** — `src/lib/ideas/pipelineMachine.ts` + `src/lib/pipeline/` are new. `statusMachine.ts` and `evaluation.ts` untouched.

3. **Append-only audit log** — `stageTransitions` never has rows deleted or updated. Full history always queryable in insertion order.

4. **Two clarification resolution paths** — Submitter responds (natural path) or admin cancels (Q1:A decision). Both revert `ideas.status` to `stageWhenRequested` and clear `activeClarificationId`.

5. **Admin dashboard stage filter** — URL-based query param (`?stage=screening`) drives server-side filtering; no client state needed.

### Constitution Check: Post-Design Re-Evaluation

All 11 principles confirmed PASS after design:
- File count: 11 new source files + 11 new test files. No single file approaches 300-line limit.
- Zero new runtime dependencies.
- Full TDD: every source file has a corresponding test file written first.
- No backward-incompatible changes to any existing module.

