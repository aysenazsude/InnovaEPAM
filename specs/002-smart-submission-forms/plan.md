# Implementation Plan: Smart Submission Forms — Phase 2

**Branch**: `002-smart-submission-forms` | **Date**: 2026-05-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-smart-submission-forms/spec.md`

## Summary

Extend the Phase 1 idea submission form with dynamic category-specific fields and contextual guidance text. When a submitter selects a category, a set of optional extra fields (and a brief guidance message) appears instantly without a page reload. Submitted field values are persisted in a new `idea_category_data` table and displayed to admins in a read-only "Category Details" section on the idea detail view. The implementation is purely additive: no Phase 1 tables or APIs are modified, and the form remains functional for basic submission without JavaScript.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode); Node.js 20 LTS — unchanged from Phase 1  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Drizzle ORM + `better-sqlite3`, shadcn/ui — no new runtime packages required  
**Storage**: SQLite (WAL mode) via `better-sqlite3`; new table `idea_category_data` added via Drizzle migration  
**Testing**: Jest + React Testing Library (unit/component), Playwright (E2E), Stryker (mutation) — unchanged toolchain  
**Target Platform**: Node.js server — unchanged from Phase 1 (no edge runtime)  
**Project Type**: Web application — incremental feature addition to existing Next.js App Router portal  
**Performance Goals**: Category field reveal ≤ 200 ms (pure client-side React state update — no network call); overall form submission ≤ 2 s  
**Constraints**: No new runtime npm packages; `better-sqlite3` Node-only; all category field config is static (no DB-driven config); existing Phase 1 `ideas` table schema is not altered  
**Scale/Scope**: Same as Phase 1 — internal team scale (~500 concurrent users); 1 new DB table; 2 new config modules; 1 new client component; extensions to 4 existing files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Clean Code** — `CategoryFields` component has a single responsibility (render dynamic fields + guidance); `categoryFieldConfig` and `categoryGuidanceConfig` are pure config modules; no existing file is expected to exceed 300 lines after extension; ESLint + Prettier run in CI with zero-warning gate.
- [x] **II. Simple & Responsive UI/UX** — Dynamic fields and guidance section verified at ≥320px / ≥768px / ≥1280px using same Tailwind utility classes as Phase 1; semantic HTML (`<fieldset>`, `<legend>`, `<section>`, `<dl>`); `aria-live="polite"` + `role="status"` for dynamic regions; `role="alert"` for validation errors; WCAG 2.1 AA contrast maintained via existing shadcn/ui components.
- [x] **III. Minimal Dependencies** — No new runtime packages. `CategoryFields` uses existing shadcn/ui `Select`, `Input`, `Textarea`, `Label`; config modules are pure TypeScript; no new npm installs required.
- [x] **IV. Testing Philosophy** — TDD RED-GREEN-REFACTOR mandated; unit tests for `categoryFieldConfig` and `categoryGuidanceConfig` written before implementation; extended `ideaValidator` tests written before validation code; all test expectations derived from spec acceptance scenarios.
- [x] **V. Coverage Requirements** — Two new pure-function config modules (`categoryFieldConfig`, `categoryGuidanceConfig`) will reach 100% line/branch coverage trivially; overall coverage must remain ≥ 80% line / ≥ 75% branch; Stryker mutation score ≥ 75%.
- [x] **VI. Test Types & Organization** — New unit tests at `tests/unit/lib/ideas/categoryFieldConfig.test.ts` and `categoryGuidanceConfig.test.ts`; extended integration tests in `tests/integration/ideas/submit.test.ts` and `list.test.ts`; new E2E spec at `tests/e2e/ideas/submitter-sees-dynamic-fields.spec.ts`.
- [x] **VII. Naming Conventions** — `categoryFieldConfig.test.ts`, `categoryGuidanceConfig.test.ts`; E2E spec `submitter-sees-dynamic-fields.spec.ts`; `describe('categoryFieldConfig')` + `it('should X when Y')` pattern throughout.
- [x] **VIII. Test Anatomy** — AAA pattern; `beforeEach` for setup; each `it` independently runnable; no shared mutable state across tests; `clearMocks: true` in `jest.config.ts` applies globally.
- [x] **IX. Mocking & Test Data** — `idea_category_data` DB operations tested against real in-memory SQLite test DB; config modules tested directly (pure functions — no mocking needed); `tests/fixtures/ideas.ts` extended with `createIdeaWithCategoryData(category, fields, overrides?)`.
- [x] **X. Quality Criteria** — No tautological assertions; each `it` covers one behaviour; config unit tests < 1 s; integration tests < 5 s; mutation score ≥ 75%; anti-pattern checklist in PR template.
- [x] **XI. Tools & Frameworks** — All 8 `npm run` scripts unchanged; Husky pre-commit unchanged; CI Steps 1–6 required on every PR; `npm run db:generate && npm run db:migrate` documented in quickstart for the new migration.

## Project Structure

### Documentation (this feature)

```text
specs/002-smart-submission-forms/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — design decisions
├── data-model.md        # Phase 1 — schema addition + config module shapes
├── quickstart.md        # Phase 1 — developer setup guide
├── contracts/
│   └── category-data-api.md  # submitIdea extended contract + admin detail shape
└── tasks.md             # Generated by /speckit.tasks
```

### Source Code Changes (repository root)

```text
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts                   # EXTENDED — add ideaCategoryData table
│   │   └── migrations/
│   │       └── 0001_add_idea_category_data.sql  # NEW — generated by drizzle-kit
│   └── ideas/
│       ├── categoryFieldConfig.ts      # NEW — field definitions per category slug
│       ├── categoryGuidanceConfig.ts   # NEW — guidance text per category slug
│       └── ideaValidator.ts            # EXTENDED — validate category-specific fields
├── components/
│   └── ideas/
│       ├── CategoryFields.tsx          # NEW — dynamic fields + guidance client component
│       └── IdeaForm.tsx                # EXTENDED — add selectedCategory state + CategoryFields
├── app/
│   └── (portal)/
│       └── admin/
│           └── [id]/
│               └── page.tsx            # EXTENDED — left-join idea_category_data
└── components/
    └── admin/
        └── IdeaDetail.tsx              # EXTENDED — "Category Details" section

tests/
├── unit/
│   └── lib/
│       └── ideas/
│           ├── categoryFieldConfig.test.ts    # NEW
│           ├── categoryGuidanceConfig.test.ts # NEW
│           └── ideaValidator.test.ts          # EXTENDED
├── integration/
│   └── ideas/
│       ├── submit.test.ts                     # EXTENDED
│       └── list.test.ts                       # EXTENDED
├── e2e/
│   └── ideas/
│       └── submitter-sees-dynamic-fields.spec.ts  # NEW
└── fixtures/
    └── ideas.ts                               # EXTENDED — createIdeaWithCategoryData()
```

**Structure Decision**: All changes are additive within the existing single-project layout established in Phase 1. No new directories at the root level. Config modules are placed in `src/lib/ideas/` alongside `ideaValidator.ts` and `statusMachine.ts`, keeping domain logic co-located per the Phase 1 convention.

## Complexity Tracking

> No Constitution violations. No justifications required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
