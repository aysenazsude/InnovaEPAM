# Quickstart: Draft Management — Phase 4

**Branch**: `004-draft-management` | **Date**: 2026-05-14

---

## Prerequisites

- Phases 1–3 implemented and passing all tests
- SQLite DB file present (created by `npm run db:migrate`)
- Node.js ≥ 18, npm installed
- `data/uploads/` directory exists (created automatically by the dev server on first file upload)

---

## 1. Run the new DB migration

After implementing the schema additions from `data-model.md`:

```bash
npm run db:generate   # generates a new Drizzle migration file
npm run db:migrate    # applies it to the local SQLite DB
```

Verify the three new tables exist:

```bash
sqlite3 $(find . -name "*.db" | head -1) ".tables"
# Expected output includes: drafts  draft_category_data  draft_attachments
```

---

## 2. Start the dev server

```bash
npm run dev
```

---

## 3. Try the happy path manually

### Save a draft

1. Log in as a submitter (e.g., `submitter@test.com`)
2. Navigate to **New Idea** (`/ideas/new`)
3. Enter a title: "My Draft Idea"
4. Enter a description — leave category empty
5. Click **Save Draft**
6. Confirm the toast/confirmation message appears
7. Navigate to **My Drafts** (`/ideas/drafts`)
8. Verify the draft appears with title "My Draft Idea" and a timestamp

### Resume and edit

1. Click **Continue** on the draft
2. Confirm the form loads with "My Draft Idea" pre-filled
3. Select a category (e.g., Technical Innovation)
4. Fill in the category-specific fields
5. Attach a file (≤10 MB, supported type)
6. Click **Save Draft** again
7. Navigate away, return to Drafts — confirm updated timestamp

### Submit the draft

1. Resume the draft again
2. Ensure all required fields are filled
3. Click **Submit**
4. Confirm redirect to `/ideas` and the idea appears in the list
5. Navigate back to `/ideas/drafts` — confirm the draft is gone

### Delete a draft

1. Save a new draft (leave it partial)
2. On the Drafts page, click **Delete**
3. Confirm the confirmation prompt appears
4. Confirm deletion
5. Verify the draft is removed from the list

---

## 4. Run the test suite

```bash
# Unit tests (fast gate)
npm run test:unit

# Integration tests (DB + server actions)
npm run test:integration

# All tests with coverage
npm run test:coverage

# E2E (Playwright — requires dev server running)
npm run test:e2e
```

Expected new test files after implementation:

| Layer | File |
|-------|------|
| Unit | `tests/unit/lib/drafts/draftValidator.test.ts` |
| Integration | `tests/integration/drafts/saveDraft.test.ts` |
| Integration | `tests/integration/drafts/getDrafts.test.ts` |
| Integration | `tests/integration/drafts/deleteDraft.test.ts` |
| Integration | `tests/integration/drafts/submitDraftAsIdea.test.ts` |
| Unit (component) | `tests/unit/components/ideas/DraftList.test.tsx` |
| E2E | `tests/e2e/ideas/submitter-manages-drafts.spec.ts` |

---

## 5. Verify security boundaries

```bash
# Using two different submitter accounts in separate browser profiles:
# 1. Log in as submitter A, save a draft, note the draftId from the URL
# 2. Log in as submitter B in another profile
# 3. Attempt to navigate to /ideas/new?draftId={draftIdFromA}
# Expected: form loads empty (not found — no draft leaked)

# Admin should not see drafts:
# 1. Log in as admin
# 2. Navigate to /ideas/drafts
# Expected: 404 or redirect (admin route does not exist)
```

---

## 6. Key files changed by this feature

| Path | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add `drafts`, `draftCategoryData`, `draftAttachments` tables + types |
| `src/lib/db/migrations/` | New Drizzle migration file |
| `src/lib/actions/drafts.ts` | New server actions (saveDraft, getDrafts, getDraft, deleteDraft, submitDraftAsIdea) |
| `src/lib/drafts/draftValidator.ts` | Validation rules for draft saves (nullable field rules) |
| `src/components/ideas/IdeaForm.tsx` | Add `draftId` + `defaultValues` props; "Save Draft" button |
| `src/components/ideas/DraftList.tsx` | New component: list of draft cards with Continue + Delete |
| `src/app/(portal)/ideas/drafts/page.tsx` | New route: drafts list page |
| `src/app/(portal)/ideas/new/page.tsx` | Read `?draftId` param; fetch and pass draft to IdeaForm |
| `src/app/api/attachments/[storagePath]/route.ts` | Add draft attachment auth check |
| `src/lib/constants.ts` | Add `MAX_DRAFTS_PER_USER = 10` constant |
