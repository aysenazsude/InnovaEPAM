---

description: "Task list for Smart Submission Forms — Phase 2"
---

# Tasks: Smart Submission Forms — Phase 2

**Input**: Design documents from `/specs/002-smart-submission-forms/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/category-data-api.md ✅, quickstart.md ✅

**Tests**: Included — TDD is mandated by Constitution Principle IV; the spec contains an explicit Testing Strategy section.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All paths are relative to repository root

---

## Phase 1: Setup (DB Schema & Migration)

**Purpose**: Add the `idea_category_data` table before any other work begins. All subsequent phases depend on this schema change.

- [X] T001 Add `ideaCategoryData` table definition and TypeScript types to `src/lib/db/schema.ts`
- [X] T002 Run `npm run db:generate && npm run db:migrate` to generate and apply `src/lib/db/migrations/0001_add_idea_category_data.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure-function config modules and extended validation that ALL user story phases depend on. These must be complete before any component or server action work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Write failing unit tests for `src/lib/ideas/categoryFieldConfig.ts` in `tests/unit/lib/ideas/categoryFieldConfig.test.ts` (covers: correct fields per slug; "Other" returns `[]`; unknown slug throws)
- [X] T004 [P] Create `src/lib/ideas/categoryFieldConfig.ts` with `CATEGORY_FIELDS: Record<CategorySlug, FieldDefinition[]>` per data-model.md — make T003 tests pass
- [X] T005 [P] Write failing unit tests for `src/lib/ideas/categoryGuidanceConfig.ts` in `tests/unit/lib/ideas/categoryGuidanceConfig.test.ts` (covers: correct guidance string per slug; unknown slug throws)
- [X] T006 [P] Create `src/lib/ideas/categoryGuidanceConfig.ts` with `CATEGORY_GUIDANCE: Record<CategorySlug, string>` per spec FR-014 — make T005 tests pass
- [X] T007 Write failing unit tests for category-field validation in `tests/unit/lib/ideas/ideaValidator.test.ts` (extends existing file; covers: text input ≤100 chars, textarea ≤500 chars, optional fields absent passes, fields from wrong category are ignored)
- [X] T008 Extend `src/lib/ideas/ideaValidator.ts` with category-specific field validation driven by `CATEGORY_FIELDS` — make T007 tests pass
- [X] T009 [P] Extend `tests/fixtures/ideas.ts` with `createIdeaWithCategoryData(category, fields, overrides?)` factory function

**Checkpoint**: Config modules and validation complete — US1 / US2 / US3 implementation can now begin.

---

## Phase 3: User Story 1 — Category-Specific Fields Appear Dynamically (Priority: P1) 🎯 MVP

**Goal**: Submitter selects a category → correct optional fields appear instantly; values persist to `idea_category_data` on submission; admin can see submitted field values.

**Independent Test**: Log in as submitter → open `/ideas/new` → select "Technical Innovation" → verify "Technology Area" and "Estimated Effort" dropdowns appear → submit → verify row exists in `idea_category_data`; log in as admin → open idea detail → verify "Category Details" section shows submitted values.

- [X] T010 [US1] Write failing component tests for `src/components/ideas/CategoryFields.tsx` in `tests/unit/lib/ideas/CategoryFields.test.tsx` (covers: renders correct fields per category slug; renders no fields for "Other"; renders empty when no category selected)
- [X] T011 [P] [US1] Create `src/components/ideas/CategoryFields.tsx` — renders the field set for the given `category` prop using `CATEGORY_FIELDS`; includes live character counter beneath each `textarea` field — make T010 tests pass
- [X] T012 [US1] Extend `src/components/ideas/IdeaForm.tsx` — add `selectedCategory` state driven by the existing `<Select>` onChange; render `<CategoryFields category={selectedCategory} />` below the category field; pass category-specific field errors from `state.errors` to `CategoryFields`
- [X] T013 [US1] Write failing integration tests for `submitIdea` with category data in `tests/integration/ideas/submit.test.ts` (extends existing file; covers: category fields persisted to `idea_category_data`; server rejects values exceeding char limits with field-level `{ errors: { fieldName } }`; missing optional fields do not block submission)
- [X] T014 [US1] Extend `src/lib/actions/ideas.ts` `submitIdea` — after idea insert, collect whitelisted FormData keys from `CATEGORY_FIELDS[category]`, validate lengths, insert row into `idea_category_data` — make T013 tests pass
- [X] T015 [P] [US1] Extend `tests/integration/ideas/list.test.ts` — add assertions that `idea_category_data` fields are returned in idea detail response (FR-007)
- [X] T016 [P] [US1] Extend `src/app/(portal)/admin/[id]/page.tsx` — LEFT JOIN `idea_category_data` on `idea_id`; pass `categoryData` as nullable prop to `IdeaDetail`
- [X] T017 [US1] Extend `src/components/admin/IdeaDetail.tsx` — render read-only "Category Details" `<section>` with `<dl>` of non-null field name/value pairs when `categoryData?.fields` has at least one value; omit section entirely when `categoryData` is null or fields are all empty

---

## Phase 4: User Story 2 — Category-Specific Guidance Text (Priority: P2)

**Goal**: Selecting a category reveals a visually distinct guidance message explaining what evaluators need; guidance updates or hides when category changes.

**Independent Test**: Open `/ideas/new` → select each category in turn → verify correct guidance text appears in a distinct container after each selection → verify guidance disappears when no category selected.

- [X] T018 [US2] Write failing component tests for guidance text in `tests/unit/lib/ideas/CategoryFields.test.tsx` (extends T010 file; covers: correct guidance string rendered per category; no guidance rendered when category is undefined/null; guidance updates when category prop changes)
- [X] T019 [US2] Extend `src/components/ideas/CategoryFields.tsx` — add guidance text container with `aria-live="polite"` `role="status"` rendering `CATEGORY_GUIDANCE[category]` above the field set — make T018 tests pass

---

## Phase 5: User Story 3 — Shared Fields Preserved When Switching Categories (Priority: P3)

**Goal**: Changing category clears category-specific field values but leaves title and description untouched.

**Independent Test**: Type a title and description → select "Technical Innovation" → fill in "Technology Area" → change category to "Process Improvement" → verify title and description retain their values and the Technical Innovation fields are gone.

- [X] T020 [US3] Write failing component tests for shared-field preservation in `tests/unit/lib/ideas/IdeaForm.test.tsx` (covers: title and description values survive category change; category-specific field values are cleared on category change; all fields cleared after successful submission)
- [X] T021 [US3] Verify and extend `src/components/ideas/IdeaForm.tsx` — ensure `selectedCategory` state reset clears only category-specific fields while preserving `title` and `description` (implement controlled inputs for title/description if needed to satisfy T020) — make T020 tests pass

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Progressive enhancement fallback, full E2E coverage, and final quality gates.

- [X] T022 Add `<noscript>` progressive enhancement fallback to `src/components/ideas/IdeaForm.tsx` — renders all category field groups as labelled `<fieldset>` / `<legend>` blocks visible only when JS is unavailable (FR-016)
- [X] T023 [P] Write E2E spec `tests/e2e/ideas/submitter-sees-dynamic-fields.spec.ts` — covers: select each category → correct fields and guidance appear; change category → previous fields cleared, shared fields retained; submit with optional fields empty → succeeds; submit with textarea exceeding 500 chars → inline field error appears
- [X] T024 Run `npm run typecheck && npm run lint && npm run test:coverage` and confirm zero TS errors, zero ESLint warnings, ≥ 80% line coverage, ≥ 75% branch coverage

---

## Dependencies (Story Completion Order)

```
Phase 1 (T001-T002)
    └── Phase 2 (T003-T009) — must be complete before any Phase 3/4/5 work
            ├── Phase 3 US1 (T010-T017) — MVP; independently testable
            ├── Phase 4 US2 (T018-T019) — extends CategoryFields from US1
            └── Phase 5 US3 (T020-T021) — extends IdeaForm from US1
                    └── Phase 6 Polish (T022-T024)
```

US2 and US3 depend on the `CategoryFields` component created in US1 (T011). They can begin once T011 is merged.

---

## Parallel Execution Examples

### Within Phase 2 (after T001-T002):
```
T003 (write categoryFieldConfig tests)   ──→ T004 (implement categoryFieldConfig)
T005 (write categoryGuidanceConfig tests) ──→ T006 (implement categoryGuidanceConfig)
T007 (write ideaValidator tests)          ──→ T008 (extend ideaValidator)
T009 (extend fixtures)                   ─── (independent, run any time in Phase 2)
```
T003+T005, T004+T006, T009 can all run in parallel tracks.

### Within Phase 3 (after Phase 2 complete):
```
T010 (CategoryFields component tests)  ──→ T011 (create CategoryFields)
T013 (submitIdea integration tests)    ──→ T014 (extend submitIdea action)
T015 (list integration test extension) ─── T016 (admin page extension)
```
T011 and T013/T014 operate on different files and can run in parallel tracks.
T015 and T016 can run in parallel after T014.
T012 depends on T011 (component must exist first).
T017 depends on T016 (admin page must have categoryData prop first).

---

## Implementation Strategy

**MVP Scope** (deliver value first): Complete Phases 1–3 (T001–T017). This delivers:
- Dynamic fields per category with persistence ✅
- Category-specific validation ✅
- Admin "Category Details" view ✅
- Full integration test coverage of the persistence path ✅

**Increment 2**: Phase 4 (T018–T019) — adds guidance text. Enhances UX, zero new infra.

**Increment 3**: Phase 5 (T020–T021) — formally verifies and tests shared-field preservation. Low risk; the IdeaForm React state design in T012 should already preserve shared fields naturally.

**Increment 4**: Phase 6 (T022–T024) — progressive enhancement, E2E coverage, final gate check.

---

## Summary

| Phase | Tasks | User Story | Parallel Opportunities |
|---|---|---|---|
| Phase 1: Setup | T001–T002 | — | None (sequential DB setup) |
| Phase 2: Foundational | T003–T009 | — | T003/T005/T009 in parallel; T004/T006 in parallel |
| Phase 3: US1 Dynamic Fields | T010–T017 | US1 | T011/T013–T014 in parallel; T015/T016 in parallel |
| Phase 4: US2 Guidance Text | T018–T019 | US2 | None (T019 extends T011 file) |
| Phase 5: US3 Field Preservation | T020–T021 | US3 | None (T021 extends T012 file) |
| Phase 6: Polish | T022–T024 | — | T022/T023 in parallel |
| **Total** | **24 tasks** | | |

**Task counts per user story**: US1 = 8 tasks, US2 = 2 tasks, US3 = 2 tasks  
**Suggested MVP**: Phases 1–3 (T001–T017, 17 tasks)
