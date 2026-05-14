---
description: "Task list for Draft Management — Phase 4"
---

# Tasks: Draft Management — Phase 4

**Input**: Design documents from `specs/004-draft-management/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/draft-management-api.md ✅, quickstart.md ✅

**Tests**: Included — constitution Principle IV (NON-NEGOTIABLE TDD) requires tests written before implementation.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different files, no dependency on an incomplete task
- **[US#]**: User story this task belongs to
- Exact file paths in every description

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Schema additions and constants that ALL user story phases depend on. No user story work can begin until T001–T003 are complete.

**⚠️ CRITICAL**: Phases 2–5 depend on the schema being migrated and the constant being added.

- [X] T001 Add `MAX_DRAFTS_PER_USER = 10` constant to `src/lib/constants.ts`
- [X] T002 [P] Add `drafts`, `draftCategoryData`, `draftAttachments` tables and TypeScript types (`Draft`, `NewDraft`, `DraftCategoryData`, `NewDraftCategoryData`, `DraftAttachment`, `NewDraftAttachment`) to `src/lib/db/schema.ts` per data-model.md schema section
- [X] T003 Generate and apply Drizzle migration: run `npm run db:generate` then `npm run db:migrate` to create migration file in `src/lib/db/migrations/`

**Checkpoint**: Three new tables exist in the DB; `MAX_DRAFTS_PER_USER` is exported from constants — all user story phases may now begin.

---

## Phase 2: User Story 1 — Save Idea as Draft (Priority: P1) 🎯 MVP

**Goal**: Submitter can save the current form state (all fields + attachments) as a named draft; draft is isolated from submitted ideas; save confirmation shown; draft limit enforced.

**Independent Test**: Log in → partially fill submission form → click "Save Draft" → navigate to `/ideas/drafts` → verify draft appears with correct title and timestamp; verify no idea appears in ideas list.

### Tests — User Story 1 (write first, ensure RED before implementation)

- [X] T004 [P] [US1] Create draft fixtures file `tests/fixtures/drafts.ts` — export `createDraftSummary(overrides?)` and `createDraftDetail(overrides?)` factory functions
- [X] T005 [P] [US1] Write unit tests for `draftValidator` in `tests/unit/lib/drafts/draftValidator.test.ts` — cover: empty title stored as null, title > 200 chars rejected, description > 2000 chars rejected, invalid category slug rejected, valid nullable fields accepted
- [X] T006 [P] [US1] Write integration tests for `saveDraft` in `tests/integration/drafts/saveDraft.test.ts` — cover: creates new draft, saves with null title as "Untitled Draft", persists category fields, persists attachments, returns `limitReached` at 10 drafts, returns `conflict` on version mismatch, unauthenticated redirects

### Implementation — User Story 1

- [X] T007 [P] [US1] Create `src/lib/drafts/draftValidator.ts` — export `validateDraftSave(input)` returning `{ valid, errors }` with nullable-field rules per data-model.md validation table
- [X] T008 [US1] Create `src/lib/drafts/draftRepository.ts` — export `countDraftsByUser`, `findDraftsByUser`, `findDraftWithAttachments`, `insertDraft`, `updateDraftWithVersionCheck`, `deleteDraftById` using Drizzle ORM against `drafts`, `draftCategoryData`, `draftAttachments` tables (depends on T002, T003)
- [X] T009 [US1] Create `src/lib/actions/drafts.ts` with `saveDraft` server action implementing create + update paths, draft count limit check, attachment reconciliation (save new files via `storage.ts`, delete removed files), and optimistic version increment per `contracts/draft-management-api.md` (depends on T007, T008)
- [X] T010 [US1] Extend `src/components/ideas/IdeaForm.tsx` — add `draftId?: string`, `draftVersion?: number`, and `defaultValues?: DraftFormValues` props; add "Save Draft" secondary button that submits to `saveDraft` action; add hidden `draftId` and `version` inputs; show `aria-live="polite"` save confirmation toast (depends on T009)

**Checkpoint**: US1 independently testable — `saveDraft` action works end-to-end; IdeaForm shows Save Draft button; draft appears in DB; no idea created.

---

## Phase 3: User Story 2 — View and Resume a Saved Draft (Priority: P2)

**Goal**: Submitter can navigate to `/ideas/drafts`, see all their drafts with timestamps, and resume any draft with all field values and attachment previews restored.

**Independent Test**: Save a draft with title, description, and one image attachment → end session → log in again → open `/ideas/drafts` → click Continue → verify form is pre-filled with all values and attachment thumbnail is shown.

### Tests — User Story 2 (write first, ensure RED before implementation)

- [X] T011 [P] [US2] Write integration tests for `getDrafts` in `tests/integration/drafts/getDrafts.test.ts` — cover: returns all drafts ordered by updatedAt DESC, returns empty array when none, sets `atLimit: true` at 10 drafts, does not return other users' drafts
- [X] T012 [P] [US2] Write integration tests for `getDraft` in `tests/integration/drafts/getDraft.test.ts` — cover: returns full draft with attachments, returns `notFound` for missing ID, returns `notFound` for another user's draft ID (no 403 — avoids enumeration)
- [X] T013 [P] [US2] Write unit tests for `DraftList` component in `tests/unit/components/ideas/DraftList.test.tsx` — cover: renders draft entries with title / timestamp, renders "Untitled Draft" for null title, renders empty-state message when list is empty, Continue link navigates to `/ideas/new?draftId=`
- [X] T014 [P] [US2] Create test helper `tests/helpers/draftHelpers.ts` — export `createDraftInDb(overrides?)` and `cleanupDraftsByUser(userId)` for use in integration tests

### Implementation — User Story 2

- [X] T015 [P] [US2] Add `getDrafts` and `getDraft` server actions to `src/lib/actions/drafts.ts` per `contracts/draft-management-api.md` return types (depends on T008)
- [X] T016 [P] [US2] Create `src/components/ideas/DraftList.tsx` — renders list of `DraftSummary` entries; each card shows title (or "Untitled Draft"), formatted `updatedAt` timestamp, attachment count, and "Continue" link (`/ideas/new?draftId=`); empty-state message with "Start a New Idea" link; `aria-live="polite"` region for feedback (depends on T015)
- [X] T017 [US2] Create `src/app/(portal)/ideas/drafts/page.tsx` — server component; calls `getDrafts()`, passes result to `DraftList`; shows `atLimit` warning banner when draft limit is reached (depends on T015, T016)
- [X] T018 [US2] Modify `src/app/(portal)/ideas/new/page.tsx` — read `?draftId` search param; if present call `getDraft(draftId)` server-side; pass `draftId`, `draftVersion`, and `defaultValues` props to `IdeaForm`; redirect to `/ideas/drafts` with error if `notFound` (depends on T010, T015)

**Checkpoint**: US2 independently testable — drafts list page renders correctly; resuming a draft pre-fills IdeaForm with all saved values and attachment previews.

---

## Phase 4: User Story 3 — Submit a Draft as a Final Idea (Priority: P3)

**Goal**: Submitter can submit an open draft as a final idea; same validation as direct submission; draft is atomically deleted on success; idea appears in ideas list.

**Independent Test**: Resume a draft with all required fields → click Submit → verify idea appears in `/ideas` list with correct data and attachments → verify draft no longer appears in `/ideas/drafts`.

### Tests — User Story 3 (write first, ensure RED before implementation)

- [X] T019 [P] [US3] Write integration tests for `submitDraftAsIdea` in `tests/integration/drafts/submitDraftAsIdea.test.ts` — cover: creates idea + deletes draft in single transaction, validation errors leave draft intact, version conflict returns `conflict` without creating idea, attachments are promoted to `attachments` table, server error leaves draft intact

### Implementation — User Story 3

- [X] T020 [US3] Add `submitDraftAsIdea` server action to `src/lib/actions/drafts.ts` implementing the atomic 5-step transaction (INSERT idea → INSERT idea_category_data → INSERT attachments from draft → DELETE draft_attachments → DELETE draft with version check) per `contracts/draft-management-api.md`; redirects to `/ideas` on success (depends on T008, T009)
- [X] T021 [US3] Update `src/components/ideas/IdeaForm.tsx` — in draft mode (`draftId` present), wire the "Submit" button to call `submitDraftAsIdea` instead of `submitIdea`; display inline validation errors and `conflict` warning without clearing form values (depends on T010, T020)

**Checkpoint**: US3 independently testable — full save→resume→submit lifecycle works end-to-end; idea created; draft removed; attachments transferred.

---

## Phase 5: User Story 4 — Delete a Draft (Priority: P4)

**Goal**: Submitter can permanently delete a draft (with confirmation) from the drafts list; all associated files removed from storage.

**Independent Test**: Save two drafts → click Delete on one → confirm deletion → verify only one draft remains in list → verify deleted draft's attachment URL returns 404.

### Tests — User Story 4 (write first, ensure RED before implementation)

- [X] T022 [P] [US4] Write integration tests for `deleteDraft` in `tests/integration/drafts/deleteDraft.test.ts` — cover: deletes draft and files from storage, returns `notFound` for another user's draft, files removed via `deleteFile`, cascade removes `draft_attachments` and `draft_category_data`, single remaining draft shows empty-state after last deletion

### Implementation — User Story 4

- [X] T023 [US4] Add `deleteDraft` server action to `src/lib/actions/drafts.ts` — load `draft_attachments` for owner, call `deleteFile` for each, DELETE draft (CASCADE handles related rows), return `{ success: true }` per `contracts/draft-management-api.md` (depends on T008)
- [X] T024 [US4] Add "Delete" button with inline confirmation dialog to `src/components/ideas/DraftList.tsx` — confirmation prompt before calling `deleteDraft`; on success remove card from list; transition to empty-state when last draft deleted; dismiss returns to unchanged list (depends on T016, T023)

**Checkpoint**: US4 independently testable — delete flow works from drafts list; files removed from disk; empty-state shown when all drafts deleted.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, accessibility, and E2E coverage for the full draft lifecycle.

- [X] T025 [P] Extend `src/app/api/attachments/[storagePath]/route.ts` — add draft attachment authorization check: if `storagePath` matches a `draft_attachments` record owned by the current user, allow access; deny if owned by another user or if admin (per `contracts/draft-management-api.md` security addition)
- [X] T026 [P] Write E2E spec `tests/e2e/ideas/submitter-manages-drafts.spec.ts` — covers full lifecycle: save draft → navigate away → resume draft → verify pre-fill → edit → save again → submit as idea → verify idea in list → verify draft gone; covers delete flow with confirmation

---

## Dependencies (User Story Completion Order)

```
Phase 1 (Foundational)
  └─► Phase 2 (US1: Save Draft)           — T001–T003 must be complete
        └─► Phase 3 (US2: View & Resume)  — T007–T010 must be complete
              └─► Phase 4 (US3: Submit)   — T015–T018 must be complete
                    └─► Phase 5 (US4: Delete) — independent of US3, needs US2 (T016)
                          └─► Phase 6 (Polish) — all phases complete
```

US1 → US2 → US3 are sequential (each builds on the previous).
US4 depends on the DraftList component (US2: T016) but not on US3.

---

## Parallel Execution — Within Each Phase

```
Phase 1:  T001 ║ T002  → T003 (sequential — migration needs schema)

Phase 2:  T004 ║ T005 ║ T006  (test/fixture files — all parallel)
          T007 ║ T008          (validator + repository — different files)
          T009 → T010          (action → IdeaForm — sequential)

Phase 3:  T011 ║ T012 ║ T013 ║ T014  (all test/helper files — parallel)
          T015 ║ T016                 (actions + component — parallel)
          T017 ║ T018                 (pages — parallel after T015, T016)

Phase 4:  T019                (single test file)
          T020 → T021         (action → IdeaForm wiring — sequential)

Phase 5:  T022                (single test file)
          T023 → T024         (action → DraftList UI — sequential)

Phase 6:  T025 ║ T026         (route fix + E2E — parallel)
```

---

## Implementation Strategy

**MVP** = Phase 1 + Phase 2 (US1 only) — delivers the ability to save drafts. Independently demonstrable.

**Full feature** = Phases 1–5 — all four user stories complete.

**Recommended delivery order**:
1. Phase 1 first (unlocks everything)
2. Phase 2 next (US1 = core value; MVP shippable here)
3. Phase 3 (US2 = makes saving useful; completes save-and-continue loop)
4. Phase 4 (US3 = closes lifecycle; drafts become submittable)
5. Phase 5 (US4 = housekeeping; prevents unbounded accumulation)
6. Phase 6 (security + E2E; ship-ready)

---

## Summary

| Metric | Count |
|--------|-------|
| Total tasks | 26 |
| Phase 1 (Foundational) | 3 |
| Phase 2 (US1 — Save Draft) | 7 |
| Phase 3 (US2 — View & Resume) | 8 |
| Phase 4 (US3 — Submit Draft) | 3 |
| Phase 5 (US4 — Delete Draft) | 3 |
| Phase 6 (Polish) | 2 |
| Parallelizable tasks [P] | 16 |
| Test tasks | 10 |
| Implementation tasks | 16 |
