# Quickstart: Smart Submission Forms — Phase 2

**Feature**: `002-smart-submission-forms`  
**Assumes**: Phase 1 quickstart complete — repo cloned, dependencies installed, `.env.local` configured, Phase 1 DB seeded.

---

## 1. Switch to the Feature Branch

```bash
git checkout 002-smart-submission-forms
npm install   # no new runtime packages expected; run to confirm lock-file is clean
```

---

## 2. Apply the Database Migration

Phase 2 adds one new table (`idea_category_data`). Generate and apply:

```bash
npm run db:generate   # generates migration SQL in src/lib/db/migrations/
npm run db:migrate    # applies migration to data/innovatepam.db
```

Verify the table exists:

```bash
sqlite3 data/innovatepam.db ".schema idea_category_data"
```

Expected output:
```sql
CREATE TABLE idea_category_data (
  idea_id    TEXT    NOT NULL PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  category   TEXT    NOT NULL,
  fields     TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
```

Existing Phase 1 `ideas` rows have no `idea_category_data` row. The admin detail view handles this gracefully (no "Category Details" section rendered for pre-Phase-2 ideas).

---

## 3. Key New Source Files

| File | Purpose |
|---|---|
| `src/lib/ideas/categoryFieldConfig.ts` | Pure TS config: field definitions per category |
| `src/lib/ideas/categoryGuidanceConfig.ts` | Pure TS config: guidance text per category |
| `src/components/ideas/CategoryFields.tsx` | Client component: renders dynamic fields + guidance |
| `src/lib/db/schema.ts` | Extended with `ideaCategoryData` table definition |
| `src/lib/actions/ideas.ts` | Extended: persists `idea_category_data` on submission |
| `src/app/(portal)/admin/[id]/page.tsx` | Extended: left-joins `idea_category_data` for detail view |
| `src/components/admin/IdeaDetail.tsx` | Extended: renders "Category Details" section |

---

## 4. Run the Test Suite

### Unit tests (fast — run first)

```bash
npm run test:unit
```

New unit test files to implement (RED first, per TDD):

- `tests/unit/lib/ideas/categoryFieldConfig.test.ts`
- `tests/unit/lib/ideas/categoryGuidanceConfig.test.ts`
- `tests/unit/lib/ideas/ideaValidator.test.ts` (extended)

### Integration tests

```bash
npm run test:integration
```

Extended integration test files:

- `tests/integration/ideas/submit.test.ts` (extended)
- `tests/integration/ideas/list.test.ts` (extended)

### E2E tests (requires running dev server)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e -- --grep "dynamic-fields"
```

New E2E spec: `tests/e2e/ideas/submitter-sees-dynamic-fields.spec.ts`

### Full coverage gate

```bash
npm run test:coverage
```

Must maintain ≥ 80% line coverage, ≥ 75% branch coverage. Phase 2 adds two new pure-function modules (`categoryFieldConfig`, `categoryGuidanceConfig`) that should reach 100% coverage easily.

---

## 5. Verify Dynamic Fields in the Browser

1. `npm run dev`
2. Register or log in as a submitter.
3. Navigate to `/ideas/new`.
4. Select "Technical Innovation" → verify "Technology Area" and "Estimated Effort" dropdowns appear with guidance text above.
5. Change to "Process Improvement" → verify Technical Innovation fields disappear, Process Improvement fields appear empty, title/description retain their values.
6. Select "Other" → verify no additional fields appear, guidance text updates.
7. Submit a form with a filled text area exceeding 500 characters → verify inline error appears next to the offending field without losing other field values.

---

## 6. Verify Admin "Category Details" Display

1. Log in as an admin (role `admin`).
2. Open an idea that was submitted with at least one category-specific field filled.
3. Verify a "Category Details" section appears below the idea description with labelled field values.
4. Open an idea submitted before Phase 2 (no `idea_category_data` row) → verify no "Category Details" section is rendered.

---

## 7. TypeScript & Lint Gates

```bash
npm run typecheck   # must report zero errors
npm run lint        # must report zero warnings
```

The `CategorySlug` type from `src/lib/constants.ts` is reused in both config modules — ensure no string-literal duplication.
