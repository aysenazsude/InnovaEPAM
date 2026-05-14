# Tasks: Idea Spotlight & News Section

**Input**: Design documents from `specs/009-idea-spotlight/`  
**Branch**: `009-idea-spotlight`  
**Date**: 2026-05-15  
**Prerequisites**: plan.md ✓ | spec.md ✓ | research.md ✓ | data-model.md ✓ | contracts/spotlight-api.md ✓ | quickstart.md ✓

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[Story]**: Which user story (`US1`–`US4`) this task belongs to
- Exact file paths included in every task

---

## Phase 1: Setup (DB Foundation)

**Purpose**: Establish the new `spotlight_picks` table and Drizzle schema — prerequisite for all user stories.

- [X] T001 Create migration `src/lib/db/migrations/0006_spotlight_picks.sql` with `CREATE TABLE spotlight_picks`, unique index on `month_year`, and index on `idea_id` (see data-model.md DDL)
- [X] T002 Add `spotlightPicks` table definition, `SpotlightPick` and `NewSpotlightPick` types to `src/lib/db/schema.ts`
- [X] T003 Apply migration locally: run `npx drizzle-kit generate && npx drizzle-kit migrate` and verify `data/innovatepam.db` now contains `spotlight_picks`

**Checkpoint**: `spotlight_picks` table exists in the DB and in the Drizzle schema. All user story phases can now proceed.

---

## Phase 2: Foundational (Server Action — shared by all stories)

**Purpose**: Implement and fully test `getSpotlightData`, `pinEditorsPick`, and `unpinEditorsPick` server actions. These are blocking prerequisites for all UI user stories.

**⚠️ CRITICAL**: No component or page work can begin until this phase is complete.

- [X] T004 Write integration tests (RED) for `getSpotlightData` in `tests/integration/spotlight/getSpotlightData.test.ts` covering: returns null spotlight when no ideas this month; returns Score Pending when ideas exist but none scored; returns Top Rated with correct `AVG(score)` composite; returns Editor's Pick when one is pinned; recently approved ordered by `evaluatedAt DESC` limited to 5; `hasMoreApproved` true when >5 approved; monthly activity counts correct — use `createTestDb()` and inject `dbInstance`
- [X] T005 Write integration tests (RED) for pin/unpin in `tests/integration/spotlight/pinEditorsPick.test.ts` covering: pin inserts row for current month; pin replaces existing pick for same month (upsert); unpin deletes current month row; unpin is idempotent; non-admin gets `{ success: false, error: 'Unauthorized' }`
- [X] T006 Implement `src/lib/actions/spotlight.ts` exporting `SpotlightIdea`, `RecentlyApprovedIdea`, `MonthlyActivity`, `SpotlightPageData` interfaces and `getSpotlightData(dbInstance?)`, `pinEditorsPick(ideaId)`, `unpinEditorsPick()` server actions per contracts/spotlight-api.md — use `Promise.all` for the three parallel read queries; spotlight cascade: Editor's Pick → highest scored → most recent unscored → null; compute `currentMonth` as `new Date().toISOString().slice(0, 7)`; divide epoch ms by 1000 in SQLite date functions; `revalidatePath('/home')` and `revalidatePath('/admin')` after mutations
- [X] T007 Run `tests/integration/spotlight/` and confirm all tests pass (GREEN); run `npx tsc --noEmit` — zero errors

**Checkpoint**: Server actions are fully tested and green. UI stories can now be implemented.

---

## Phase 3: User Story 1 — Best Idea of the Month Spotlight (Priority: P1) 🎯 MVP

**Goal**: Any authenticated user on `/home` sees the month's top-scored idea in a `SpotlightCard`. Empty state shown when no ideas exist for the month.

**Independent Test**: Log in as any user, navigate to `/home`, verify a spotlight section is visible (spotlight card or graceful empty state). Confirm "Top Rated" label when scored idea exists, "Score Pending" when not.

### Tests for User Story 1

- [X] T008 [P] [US1] Write unit tests (RED) for `SpotlightCard` in `tests/unit/components/dashboard/SpotlightCard.test.tsx` covering: renders empty state when `spotlight` prop is null; renders idea title, author, category, and score when `spotlight` provided; renders "Top Rated" label badge; renders "Score Pending" when `compositeScore` is null; clicking card links to `/ideas/${id}`; pin button NOT shown when `isAdmin` is false
- [X] T009 [US1] Implement `src/components/dashboard/SpotlightCard.tsx` — props: `{ spotlight: SpotlightIdea | null; isAdmin: boolean; currentPickIdeaId: string | null }`; dark-theme tokens (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`); "Top Rated" badge in `bg-brand-500/20 text-brand-400`; "Score Pending" badge in `bg-secondary text-muted-foreground`; empty state with dashed border and `Lightbulb` icon; `compositeScore` displayed as `"X.X / 5"` (1 decimal place); make component < 100 lines
- [X] T010 [US1] Run `tests/unit/components/dashboard/SpotlightCard.test.tsx` (GREEN) and confirm `npx tsc --noEmit` passes
- [X] T011 [US1] Update `src/app/(portal)/home/page.tsx` to call `getSpotlightData()` alongside `getDashboardData()` (use `Promise.all`), then render `<SpotlightCard spotlight={data.spotlight} isAdmin={session.user.role === 'admin'} currentPickIdeaId={data.currentPickIdeaId} />` in a new `<section>` below the hero banner

**Checkpoint**: User Story 1 is independently testable — `/home` shows spotlight card or empty state. 7 unit tests green.

---

## Phase 4: User Story 2 — Recently Approved Ideas Feed (Priority: P2)

**Goal**: All authenticated users on `/home` see up to 5 most-recently-approved ideas with title, category, and approval date. A "View all" link appears when more than 5 exist.

**Independent Test**: Approve an idea in the DB, navigate to `/home`, confirm it appears in the "Recently Approved" section ordered by `evaluatedAt` descending.

### Tests for User Story 2

- [X] T012 [P] [US2] Write unit tests (RED) for `RecentlyApprovedFeed` in `tests/unit/components/dashboard/RecentlyApprovedFeed.test.tsx` covering: renders empty state "The first approved idea will appear here." when `ideas` is empty; renders up to 5 items each with title, category, and formatted date; shows "View all approved ideas" link when `hasMore` is true; does NOT show "View all" link when `hasMore` is false; each idea title links to `/ideas/${id}`
- [X] T013 [US2] Implement `src/components/dashboard/RecentlyApprovedFeed.tsx` — props: `{ ideas: RecentlyApprovedIdea[]; hasMore: boolean }`; list rendered as `<ul>` with `<li>` items; approval date formatted as `"DD MMM YYYY"` using `date-fns format`; "View all approved ideas" links to `/ideas?status=approved`; dark-theme tokens; < 80 lines
- [X] T014 [US2] Run `tests/unit/components/dashboard/RecentlyApprovedFeed.test.tsx` (GREEN) and confirm `npx tsc --noEmit` passes
- [X] T015 [US2] Update `src/app/(portal)/home/page.tsx` to render `<RecentlyApprovedFeed ideas={data.recentlyApproved} hasMore={data.hasMoreApproved} />` alongside the spotlight section in a responsive two-column grid (spotlight left, feed right on desktop; stacked on mobile)

**Checkpoint**: User Story 2 independently testable — "Recently Approved" section visible on `/home`. 5 unit tests green.

---

## Phase 5: User Story 3 — Monthly Activity Snapshot (Priority: P3)

**Goal**: All authenticated users on `/home` see a strip showing submitted / in-review / approved counts for the current calendar month.

**Independent Test**: Check that the activity strip on `/home` shows three counts labelled with the current month name, all reflecting actual DB state.

### Tests for User Story 3

- [X] T016 [P] [US3] Write unit tests (RED) for `MonthlyActivityStrip` in `tests/unit/components/dashboard/MonthlyActivityStrip.test.tsx` covering: renders month label (e.g. "May 2026"); renders all three counters — submitted, in review, approved; zero counts render as "0" not blank or undefined; counter labels are present and visible
- [X] T017 [US3] Implement `src/components/dashboard/MonthlyActivityStrip.tsx` — props: `{ activity: MonthlyActivity }`; three stat boxes in a horizontal flex row; icons from `lucide-react` (`FileText`, `Clock`, `CheckCircle2`); dark-theme tokens; `activity.monthLabel` shown as section header; < 60 lines
- [X] T018 [US3] Run `tests/unit/components/dashboard/MonthlyActivityStrip.test.tsx` (GREEN) and confirm `npx tsc --noEmit` passes
- [X] T019 [US3] Update `src/app/(portal)/home/page.tsx` to render `<MonthlyActivityStrip activity={data.monthlyActivity} />` as a full-width strip above the spotlight/feed two-column grid

**Checkpoint**: User Story 3 independently testable — monthly counts strip visible on `/home`. 4 unit tests green.

---

## Phase 6: User Story 4 — Admin: Pin an Editor's Pick (Priority: P4)

**Goal**: Admins can pin any idea as "Editor's Pick" from the admin dashboard; the pinned idea immediately appears as spotlight on `/home` with an "Editor's Pick" gold badge. Admins can unpin to revert.

**Independent Test**: Admin logs into `/admin`, pins an idea, navigates to `/home`, verifies the idea appears with "Editor's Pick" label. Admin unpins, verifies spotlight reverts.

### Tests for User Story 4

- [X] T020 [P] [US4] Extend `tests/unit/components/dashboard/SpotlightCard.test.tsx` with admin-specific tests: pin button visible when `isAdmin` is true and idea is NOT currently pinned; unpin button visible when `isAdmin` is true and `idea.id === currentPickIdeaId`; "Editor's Pick" badge renders in gold (`bg-yellow-500/20 text-yellow-400`) when `label === "Editor's Pick"`
- [X] T021 [P] [US4] Write E2E test `tests/e2e/admin/admin-pins-editors-pick.spec.ts` covering: admin logs in, navigates to `/admin`, pins first idea, navigates to `/home`, sees "Editor's Pick" badge; admin unpins, navigates to `/home`, "Editor's Pick" badge gone

### Implementation for User Story 4

- [X] T022 [US4] Update `src/components/dashboard/SpotlightCard.tsx` to render "Editor's Pick" gold badge when `spotlight.label === "Editor's Pick"` (`bg-yellow-500/20 text-yellow-400 border border-yellow-800`); add pin `<form>` with `action={pinEditorsPick.bind(null, spotlight.id)}` when `isAdmin && spotlight.id !== currentPickIdeaId`; add unpin `<form>` with `action={unpinEditorsPick}` when `isAdmin && spotlight.id === currentPickIdeaId`
- [X] T023 [US4] Update `src/components/admin/AdminIdeaList.tsx` to accept `currentPickIdeaId: string | null` prop; for each idea card add a small "Pin as Editor's Pick" form button (shown when `idea.id !== currentPickIdeaId`) and "Unpin" form button (shown when `idea.id === currentPickIdeaId`); import `pinEditorsPick` and `unpinEditorsPick` from `src/lib/actions/spotlight.ts`
- [X] T024 [US4] Update `src/app/(portal)/admin/page.tsx` to call `getSpotlightData()` (or a lighter `getCurrentPickIdeaId(dbInstance)` helper), then pass `currentPickIdeaId={data.currentPickIdeaId}` to `<AdminIdeaList>`
- [X] T025 [US4] Run `tests/unit/components/dashboard/SpotlightCard.test.tsx` (GREEN for admin tests) and confirm `npx tsc --noEmit` passes

**Checkpoint**: User Story 4 independently testable — admin can pin/unpin Editor's Pick; gold badge appears on `/home`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E test for the submitter path, final validation, and type-check pass.

- [X] T026 [P] Write E2E test `tests/e2e/ideas/submitter-sees-spotlight.spec.ts` covering: submitter logs in, navigates to `/home`, sees spotlight section (card or empty state); sees "Recently Approved" section; sees "Monthly Activity" strip; no console errors
- [X] T027 [P] Run full validation suite: `npx tsc --noEmit && npm run lint && npm run test:unit && npm run test:integration` — all must pass with zero errors/warnings
- [X] T028 Verify responsive layout at 375px (mobile) and 768px (tablet) widths — spotlight and feed sections stack vertically on mobile, sit in two-column grid on desktop; monthly activity strip full-width at all breakpoints

**Checkpoint**: All 28 tasks complete. Feature ready for review.

---

## Dependencies (User Story Completion Order)

```
Phase 1 (T001–T003)  ─────────────────────────────────────────────┐
                                                                    │
Phase 2 (T004–T007)  ← blocked by Phase 1                         │
                       (spotlight_picks schema must exist)          │
       │                                                            │
       ├── Phase 3 (T008–T011) [US1 — Spotlight card]              │
       │                                                            │
       ├── Phase 4 (T012–T015) [US2 — Approved feed]               │
       │         can start in parallel with Phase 3 at T012, T013  │
       │                                                            │
       ├── Phase 5 (T016–T019) [US3 — Activity strip]              │
       │         can start in parallel with Phase 3+4              │
       │                                                            │
       └── Phase 6 (T020–T025) [US4 — Admin pin]                   │
                 blocked by Phase 3 (SpotlightCard component)       │
                                                                    │
Phase 7 (T026–T028) ← blocked by Phases 3–6 all complete ──────────┘
```

## Parallel Execution Opportunities

**Within Phase 2**: T004 and T005 can be written in parallel (different test files).

**Within Phase 3–5**: After T007 (actions green):
- T008 (SpotlightCard unit tests) can run parallel to T012 (RecentlyApprovedFeed unit tests) and T016 (MonthlyActivityStrip unit tests)
- T009 (SpotlightCard impl) → T010 (run tests) → T011 (wire into page)
- T013 (RecentlyApprovedFeed impl) → T014 (run tests) → T015 (wire into page)
- T017 (MonthlyActivityStrip impl) → T018 (run tests) → T019 (wire into page)

**Within Phase 6**: T020 (SpotlightCard admin unit tests) and T021 (E2E) can be written in parallel.

**Within Phase 7**: T026 (E2E) and T027 (full validation) are independent and can run concurrently.

## Implementation Strategy

**MVP Scope** (deliver value after Phase 3 complete):
- User Story 1 (Spotlight card) alone constitutes the MVP — it directly addresses the user's core request ("best idea of the month").

**Incremental Delivery**:
1. Phase 1–3: Spotlight card on `/home` — MVP
2. Phase 4: Add "Recently Approved" feed — completes transparency goal
3. Phase 5: Add Monthly Activity strip — completes motivational context goal
4. Phase 6: Add admin Editor's Pick — completes editorial control goal
5. Phase 7: Polish, E2E, final validation

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 28 |
| Phase 1 (Setup) | 3 tasks |
| Phase 2 (Foundational) | 4 tasks |
| Phase 3 (US1 — Spotlight) | 4 tasks |
| Phase 4 (US2 — Approved feed) | 4 tasks |
| Phase 5 (US3 — Activity strip) | 4 tasks |
| Phase 6 (US4 — Admin pin) | 6 tasks |
| Phase 7 (Polish) | 3 tasks |
| Parallelizable tasks [P] | 10 tasks |
| New files | 12 |
| Modified files | 4 |
| Integration test scenarios | 12 |
| Unit test scenarios | 19 |
| E2E test scenarios | 7 |
