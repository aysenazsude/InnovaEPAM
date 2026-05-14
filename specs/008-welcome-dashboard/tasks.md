# Tasks: Welcome Dashboard

**Input**: Design documents from `/specs/008-welcome-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/dashboard-api.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Create directory structure and wire the new route into the portal

- [X] T001 Create directories `src/app/(portal)/home/` and `src/components/dashboard/`
- [X] T002 Create `src/lib/actions/dashboard.ts` stub exporting the `SystemStats`, `UserStats`, `LastSubmission`, and `DashboardData` types (no implementation yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure all user stories depend on — session routing update and data action implementation

**⚠️ CRITICAL**: Both tasks in this phase must be complete before any user story phase begins

- [X] T003 Update `getRoleHome` in `src/lib/auth/sessionManager.ts` so `getRoleHome('submitter')` returns `/home` instead of `/ideas`; extend `tests/unit/lib/auth/sessionManager.test.ts` with failing tests first
- [X] T004 Implement `getDashboardData(dbInstance?)` in `src/lib/actions/dashboard.ts`: two parallel SQL aggregation queries (system counts + user counts + last submission); redirects to `/login` if unauthenticated; returns zero-filled structs when DB is empty — write failing integration tests in `tests/integration/dashboard/getDashboardData.test.ts` first

**Checkpoint**: `getRoleHome` routes submitters to `/home`; `getDashboardData` returns correct data from in-memory test DB.

---

## Phase 3: User Story 1 — Submitter Views Personal Activity Overview (Priority: P1) 🎯 MVP

**Goal**: The welcome page shows the logged-in submitter's personal submission stats and their most recent idea with live status.

**Independent Test**: A submitter with ideas logs in → lands on `/home` → sees personal stats counts and a last-submission card showing title and status. A submitter with no ideas sees the zero-state card with a CTA.

### Tests for User Story 1

> **Write these FIRST — they must FAIL before implementation**

- [X] T005 [P] [US1] Write failing unit tests for `UserStatsPanel` in `tests/unit/components/dashboard/UserStatsPanel.test.tsx`: renders personal stat counts; renders `lastSubmission` card with title and status label; renders zero-state message with CTA link when `userStats.totalSubmitted === 0`; does not crash when `lastSubmission` is `null`

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `src/components/dashboard/UserStatsPanel.tsx`: renders three personal stat numbers (submitted, approved, pending) and a last-submission card (title, formatted date, status badge); renders zero-state section with "Submit Your First Idea" button when `totalSubmitted === 0`
- [X] T007 [US1] Create `src/app/(portal)/home/page.tsx` RSC: call `getDashboardData()`; render `<UserStatsPanel>` with `userStats`, `lastSubmission`, and `userName` from session; layout with `<main>` and `<section aria-label="your activity">`

**Checkpoint**: Submitter landing on `/home` sees personal stats. Zero state visible when no ideas exist.

---

## Phase 4: User Story 2 — All Users See System-Wide Statistics (Priority: P2)

**Goal**: The welcome page shows system-wide headline stats (total submitted, total approved, total in pipeline) visible to every authenticated user.

**Independent Test**: Any user visits `/home` and sees three numeric stat cards matching the actual DB counts. All show `0` when DB has no ideas.

### Tests for User Story 2

> **Write these FIRST — they must FAIL before implementation**

- [X] T008 [P] [US2] Write failing unit tests for `StatsRow` in `tests/unit/components/dashboard/StatsRow.test.tsx`: renders three stat cards; displays correct numeric values; renders correctly when all values are zero; uses accessible labels for each card

### Implementation for User Story 2

- [X] T009 [P] [US2] Create `src/components/dashboard/StatsRow.tsx`: renders three stat cards — "Total Ideas" (`totalSubmitted`), "Approved" (`totalApproved`), "In Pipeline" (`totalInPipeline`) — responsive grid (1 col → 3 col)
- [X] T010 [US2] Update `src/app/(portal)/home/page.tsx` to add `<StatsRow stats={systemStats} />` inside a `<section aria-label="portal statistics">` above the personal section

**Checkpoint**: All three stat cards visible on `/home` with correct live counts.

---

## Phase 5: User Story 3 — Quick Actions from the Welcome Page (Priority: P3)

**Goal**: The welcome page offers one-click navigation to submit a new idea and to view the user's ideas list.

**Independent Test**: A submitter clicks "Submit New Idea" from `/home` → lands on `/ideas/new`. Clicks "View All My Ideas" → lands on `/ideas`. Both actions work without additional navigation.

### Tests for User Story 3

> **Write these FIRST — they must FAIL before implementation**

- [X] T011 [P] [US3] Write failing unit tests for `QuickActions` in `tests/unit/components/dashboard/QuickActions.test.tsx`: renders a primary "Submit New Idea" link to `/ideas/new`; renders a secondary "View All My Ideas" link to `/ideas`; links have correct `href` attributes

### Implementation for User Story 3

- [X] T012 [P] [US3] Create `src/components/dashboard/QuickActions.tsx`: primary Button linking to `/ideas/new`; outline Button linking to `/ideas`; semantic markup
- [X] T013 [US3] Update `src/app/(portal)/home/page.tsx` to include `<QuickActions />` below the activity sections
- [X] T014 [US3] Update `src/app/(portal)/layout.tsx` to add a "Home" link (`/home`) as the first nav item for submitter-role users (before "My Ideas")

**Checkpoint**: Both CTA links work from `/home`; "Home" link visible in nav for submitters.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 [P] Write E2E test `tests/e2e/ideas/submitter-sees-welcome.spec.ts` (serial): register new submitter → login → assert redirect to `/home` → assert stat cards visible → click "Submit New Idea" → assert lands on `/ideas/new`
- [X] T016 Run `npx tsc --noEmit` — fix any TypeScript errors in new or modified files
- [X] T017 Run `npm run lint` — fix any ESLint warnings in new or modified files
- [X] T018 Run `npm run test:unit && npm run test:integration` — all suites green, zero regressions in existing tests

---

## Dependencies (Completion Order)

```
T001 → T002 → T003 → T004
                       ↓
              T005 → T006 → T007   (US1 — can start after T004)
                       ↓
              T008 → T009 → T010   (US2 — can start after T004; T010 requires T007 to exist)
                       ↓
              T011 → T012 → T013   (US3 — can start after T007+T010)
                              ↓
                             T014
                              ↓
                    T015 → T016 → T017 → T018
```

## Parallel Execution Per Story

**Phase 3 (US1)**:
- T005 (unit tests) can be written while T006 (component) starts — different files

**Phase 4 (US2)**:
- T008 (unit tests) and T009 (StatsRow component) can proceed in parallel — different files

**Phase 5 (US3)**:
- T011 (unit tests) and T012 (QuickActions component) can proceed in parallel — different files

## Implementation Strategy

**MVP** = Phase 1 + Phase 2 + Phase 3 only (T001–T007).  
Delivers: submitter sees personalised stats and last submission on `/home` after login.

Increment 2 = + Phase 4 (T008–T010): system stats visible.  
Increment 3 = + Phase 5 (T011–T014): quick actions + nav link.  
Complete = + Phase 6 (T015–T018): E2E, typecheck, lint, test gate.

## Summary

| Metric | Value |
|---|---|
| Total tasks | 18 |
| Phase 1 (Setup) | 2 |
| Phase 2 (Foundational) | 2 |
| Phase 3 US1 (MVP) | 3 |
| Phase 4 US2 | 3 |
| Phase 5 US3 | 4 |
| Phase 6 (Polish) | 4 |
| Parallelisable tasks | T005, T006, T008, T009, T011, T012, T015 |
| Suggested MVP scope | T001–T007 |
