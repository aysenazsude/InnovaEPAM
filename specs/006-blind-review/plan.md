# Implementation Plan: Blind Review (Anonymous Evaluation)

**Branch**: `006-blind-review` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-blind-review/spec.md`

## Summary

Admins must not see the submitter's identity during idea evaluation. This is a **display-layer-only** change: the `submitterId` is stripped from data before it reaches any admin-facing client component, and the one server-rendered occurrence is replaced with the constant `"Anonymous Submitter"`. No database migration, no new dependencies, no schema changes. The submitter's identity is preserved in storage for notifications and audit.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)  
**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 18, Tailwind CSS, Drizzle ORM + better-sqlite3  
**Storage**: SQLite at `data/innovatepam.db` — no schema changes  
**Testing**: Jest 29 + React Testing Library (unit/integration), Playwright (E2E)  
**Target Platform**: Next.js web application, macOS dev, Linux CI  
**Project Type**: Web application (full-stack, App Router)  
**Performance Goals**: Negligible — pure object spread at component boundary, zero DB overhead  
**Constraints**: No new npm packages; zero TypeScript errors; zero ESLint warnings; all existing tests must continue to pass  
**Scale/Scope**: 3 admin-facing files modified, 1 new utility file, 1 new test file, 1 modified test file, 1 new E2E spec

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Clean Code** — `toAdminIdeaView()` is a pure function with single responsibility; `anonymize.ts` will be well under 50 lines; no magic strings (constant extracted); linter/formatter pass unchanged.
- [x] **II. Simple & Responsive UI/UX** — No new UI screens introduced; the label "Anonymous Submitter" replaces a raw UUID — this is an improvement. Existing responsive layout unchanged.
- [x] **III. Minimal Dependencies** — Zero new npm packages. Change is a string constant + TypeScript `Omit` type + one object spread.
- [x] **IV. Testing Philosophy** — Tests written before implementation per TDD; `anonymize.test.ts` covers `toAdminIdeaView()` in RED-GREEN-REFACTOR cycle.
- [x] **V. Coverage Requirements** — New file `anonymize.ts` covered 100% by unit test; `AdminIdeaList` test updated; E2E covers the critical admin evaluation workflow.
- [x] **VI. Test Types & Organization** — Unit: `tests/unit/lib/ideas/anonymize.test.ts`; E2E: `tests/e2e/ideas/admin-blind-review.spec.ts`; 1-to-1 mapping maintained.
- [x] **VII. Naming Conventions** — `anonymize.test.ts` matches `anonymize.ts`; E2E file in kebab-case; describe/it blocks follow `should X when Y` pattern.
- [x] **VIII. Test Anatomy** — AAA pattern; `beforeEach` for setup; each test independently runnable; no shared mutable state.
- [x] **IX. Mocking & Test Data** — `toAdminIdeaView()` is a pure function, tested directly without mocks; fixture updated in `tests/fixtures/ideas.ts` if needed.
- [x] **X. Quality Criteria** — Each test covers one behavior; no tautological assertions; mutation score impact minimal (pure function with trivial logic, covered by explicit field-absence assertions).
- [x] **XI. Tools & Frameworks** — All existing npm scripts continue to work; no new scripts needed; Husky pre-commit unaffected.

## Project Structure

### Documentation (this feature)

```text
specs/006-blind-review/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── blind-review-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code changes (repository root)

```text
src/
├── lib/
│   ├── constants.ts                        # MODIFIED: + ANONYMOUS_SUBMITTER_LABEL
│   └── ideas/
│       └── anonymize.ts                    # NEW: AdminIdeaView type + toAdminIdeaView()
├── components/
│   └── admin/
│       └── AdminIdeaList.tsx               # MODIFIED: ideas prop → AdminIdeaView[]
└── app/
    └── (portal)/
        └── admin/
            ├── page.tsx                    # MODIFIED: map ideas through toAdminIdeaView()
            └── ideas/
                └── [id]/
                    └── review/
                        └── page.tsx        # MODIFIED: replace {idea.submitterId} render

tests/
├── unit/
│   └── lib/
│       └── ideas/
│           └── anonymize.test.ts           # NEW: unit tests for toAdminIdeaView()
├── unit/
│   └── components/
│       └── admin/
│           └── AdminIdeaList.test.tsx      # MODIFIED: update props type + add identity-absence assertions
└── e2e/
    └── ideas/
        └── admin-blind-review.spec.ts      # NEW: E2E blind review verification
```

**Structure Decision**: Single Next.js web application. No new directories; changes are minimal and targeted.
