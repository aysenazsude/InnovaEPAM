# Tasks: Blind Review (Anonymous Evaluation)

**Input**: Design documents from `specs/006-blind-review/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/blind-review-api.md ✅ | quickstart.md ✅

**Tech Stack**: TypeScript 5 strict · Next.js 16 App Router (Turbopack) · React 18 · Tailwind CSS · Drizzle ORM + better-sqlite3 · Jest 29 + RTL · Playwright
**No migrations** · **No new dependencies**

---

## Phase 1: Setup

**Purpose**: Add the shared constant that all admin views will reference

- [X] T001 Add `ANONYMOUS_SUBMITTER_LABEL = 'Anonymous Submitter'` export to `src/lib/constants.ts`

---

## Phase 2: Foundation (Blocking Prerequisite)

**Purpose**: Create the `AdminIdeaView` DTO and `toAdminIdeaView()` helper — all Phase 3 implementation tasks depend on this type existing

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete

- [X] T002 Create `src/lib/ideas/anonymize.ts` exporting `AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'>` type and pure `toAdminIdeaView(idea: IdeaWithAttachments): AdminIdeaView` helper using object spread

**Checkpoint**: `anonymize.ts` exists with exported type and function — Phase 3 can now begin

---

## Phase 3: User Story 1 — Admin Evaluates Without Seeing Submitter Identity (Priority: P1) 🎯 MVP

**Goal**: Every admin-facing idea view shows "Anonymous Submitter" instead of the real submitter's name or user ID; `submitterId` is absent from RSC client-component payloads.

**Independent Test**: Log in as admin → open idea list, Phase 1 detail, and pipeline review pages → confirm no real submitter name or UUID is visible anywhere; complete accept/reject/advance action successfully.

### Tests for User Story 1 (write FIRST — must fail before implementation)

- [X] T003 [P] [US1] Write failing unit tests for `toAdminIdeaView()` in `tests/unit/lib/ideas/anonymize.test.ts`: assert `submitterId` absent from result, all other `IdeaWithAttachments` fields preserved, original object not mutated
- [X] T004 [P] [US1] Write failing E2E test in `tests/e2e/ideas/admin-blind-review.spec.ts`: admin logs in, opens idea list and pipeline review page, asserts text "Anonymous Submitter" is visible and submitter UUID is not present in page content

### Implementation for User Story 1

- [X] T005 [P] [US1] Change `ideas` prop type from `IdeaWithAttachments[]` to `AdminIdeaView[]` in `src/components/admin/AdminIdeaList.tsx` and update its import to use `AdminIdeaView` from `@/lib/ideas/anonymize`
- [X] T006 [P] [US1] Call `.map(toAdminIdeaView)` on the ideas array before passing to `<AdminIdeaList>` in `src/app/(portal)/admin/page.tsx`; add import for `toAdminIdeaView` from `@/lib/ideas/anonymize`
- [X] T007 [P] [US1] Replace `{idea.submitterId}` render with `{ANONYMOUS_SUBMITTER_LABEL}` in `src/app/(portal)/admin/ideas/[id]/review/page.tsx`; import `ANONYMOUS_SUBMITTER_LABEL` from `@/lib/constants`
- [X] T008 [US1] Update `tests/unit/components/admin/AdminIdeaList.test.tsx`: change idea fixture type to `AdminIdeaView` (omit `submitterId` field from mock data); add assertion that the rendered output does not contain the submitter's user ID string

**Checkpoint**: US1 fully functional — admin can evaluate any idea (accept, reject, pipeline) without ever seeing the submitter's real name or user ID; T003 and T004 tests now pass

---

## Phase 4: User Story 2 — Submitter Identity Preserved for Notifications (Priority: P2)

**Goal**: Despite the blind review UI, the system retains the real `submitterId` in the database at all times, ensuring the notification pathway (in-app or email) can always identify the correct recipient.

**Independent Test**: After an admin accepts or rejects an idea through the blind UI, directly inspect the DB record and confirm `submitterId` is intact and unchanged.

- [X] T009 [US2] Create `tests/integration/ideas/blindReviewIdentityPreservation.test.ts`: seed an idea with a known submitter via `createTestDb()`, perform accept/reject via evaluation server actions, then query the `ideas` table directly and assert `submitterId` equals the original seeded value — confirming no data mutation occurred

**Checkpoint**: US2 verified — notifications can always reach the correct recipient

---

## Phase 5: User Story 3 — Audit Trail Preserves Full Identity for Compliance (Priority: P3)

**Goal**: The submitter's identity survives the full pipeline lifecycle in storage (all stage transitions, clarification requests, final decision) while remaining absent from every admin-rendered UI page.

**Independent Test**: Advance an idea through all pipeline stages; query `ideas` and `stage_transitions` tables; confirm `submitter_id` on the idea row is unchanged and no submitter data appears in `stage_transitions`.

- [X] T010 [US3] Extend `tests/integration/ideas/blindReviewIdentityPreservation.test.ts` with additional `describe` block: advance idea through `screening → technical_review → business_review → final_decision → approved` using pipeline server actions, then assert (a) `ideas.submitterId` unchanged in DB, (b) all `stage_transitions` rows contain only `adminId` (not `submitterId`), (c) `toAdminIdeaView()` called on the final idea record returns no `submitterId` field

**Checkpoint**: US3 verified — full audit trail intact; blind review does not destroy identity data

---

## Final Phase: Polish & Verification

- [X] T011 Run `npm run typecheck` (must report zero errors), `npm run lint` (must report zero warnings), `npm run test:unit` and `npm run test:integration` (all suites green including new tests); fix any issues before marking complete

---

## Dependency Graph

```
T001 (constant)
  └──► T007 (review page render)

T002 (anonymize.ts)
  ├──► T003 (unit tests — RED)
  ├──► T005 (AdminIdeaList props)
  ├──► T006 (admin/page.tsx mapping)
  └──► T008 (AdminIdeaList test fixture)

T004 (E2E test — RED, independent of T002)

T005 ──► T008 (test uses updated fixture)

T003 + T004 pass (GREEN) after T005 + T006 + T007 are done

T009 (US2 integration test) — independent, no code deps
T010 (US3 extends T009 file) — after T009

T005, T006, T007, T009 — all parallelizable (different files)
T003, T004 — parallelizable with each other
```

---

## Parallel Execution Examples

### US1 parallel track (after T001 + T002)

```
Track A: T003 (write unit tests)    → wait for T005+T006+T007 to turn GREEN
Track B: T004 (write E2E test)      → wait for T005+T006+T007 to turn GREEN
Track C: T005 (AdminIdeaList prop)  │
Track D: T006 (admin page mapping)  │ → T008 (update AdminIdeaList test)
Track E: T007 (review page render)  │
```

### US2 + US3 parallel with US1

```
Track F: T009 → T010   (identity preservation integration tests — independent of UI tasks)
```

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (T001–T008)**

Delivers the core blind review requirement (US1): admins see "Anonymous Submitter" everywhere. Verification tests confirm both the positive behaviour (label shown) and the data hygiene (no identity in RSC payload).

Phase 4 and 5 (T009–T010) confirm existing data-layer guarantees with explicit integration tests. They do not add new application code — only test coverage.

T011 is the final quality gate before marking the feature complete.

**Estimated task count**: 11 tasks across 5 implementation phases + 1 polish phase  
**Parallel opportunities**: 5 tasks can run concurrently after T002 completes  
**Stories with independent test criteria**: 3/3
