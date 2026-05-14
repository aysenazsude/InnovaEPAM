# Implementation Plan: Idea Spotlight & News Section

**Branch**: `009-idea-spotlight` | **Date**: 2026-05-15 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/009-idea-spotlight/spec.md`

## Summary

Add a three-panel "news" section to the home dashboard that gives every authenticated user instant visibility into (1) the best idea of the month via a scored **Spotlight** card, (2) a **Recently Approved** feed of the 5 most recently approved ideas, and (3) a **Monthly Activity** strip showing submitted / in-review / approved counts for the current month. Admins additionally get the ability to manually pin any idea as "Editor's Pick" from the admin dashboard, overriding the algorithmic spotlight for the current month.

The implementation requires one new SQLite table (`spotlight_picks`), one new server action module (`spotlight.ts`), three new dashboard components, and targeted additions to the existing home page and admin idea list.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20  
**Primary Dependencies**: Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4, Drizzle ORM 0.45, better-sqlite3 12, NextAuth 5, lucide-react 1.14  
**Storage**: SQLite at `data/innovatepam.db` — Drizzle ORM with migrations in `src/lib/db/migrations/`; next migration is `0006_spotlight_picks.sql`  
**Testing**: Jest 30 + React Testing Library 16 (unit + integration), Playwright 1.60 (E2E)  
**Target Platform**: Web — Next.js App Router (SSR), dark-themed Tailwind CSS UI  
**Project Type**: Web application  
**Performance Goals**: Home page (`/home`) server render under 200 ms p95; spotlight query executes in ≤ 3 sequential DB lookups (covered by research Decision 4)  
**Constraints**: No new npm packages; all data server-rendered at page load (no polling/WebSockets); SQLite timestamps are Unix milliseconds (divide by 1000 before SQLite date functions); single-process Next.js server  
**Scale/Scope**: ~100 users, ~500 ideas; no pagination needed beyond the 5-item recently-approved limit

## Constitution Check

*Pre-design gate — all items evaluated against this feature's design:*

- [x] **I. Clean Code** — Each new file has a single responsibility. `spotlight.ts` owns data fetching and mutations. Each dashboard component is one display concern. No file will exceed 300 lines. ESLint and TypeScript strict mode enforced by existing CI.
- [x] **II. Simple & Responsive UI/UX** — All new components use existing Tailwind semantic tokens (`bg-card`, `border-border`, etc.); dark-theme palette already applied globally. Sections stack vertically on mobile and sit side-by-side on tablet+. Semantic HTML used (`<section>`, `<article>`, `<ul>`, `<li>`). No animation beyond existing transition utilities.
- [x] **III. Minimal Dependencies** — Zero new packages. All functionality uses existing Drizzle ORM, NextAuth, lucide-react, and Tailwind utilities already in the project.
- [x] **IV. Testing Philosophy** — TDD enforced: integration tests written before `getSpotlightData` implementation; unit tests written before each component. RED-GREEN-REFACTOR cycle documented in quickstart.md.
- [x] **V. Coverage Requirements** — All new server action logic covered by integration tests. All new components covered by unit tests. E2E tests cover the critical `/home` spotlight path and admin pin workflow.
- [x] **VI. Test Types & Organization** — Unit tests in `tests/unit/components/dashboard/`; integration in `tests/integration/spotlight/`; E2E in `tests/e2e/` subdirs. 1-to-1 file mapping maintained.
- [x] **VII. Naming Conventions** — Test files: `SpotlightCard.test.tsx`, `getSpotlightData.test.ts`, `submitter-sees-spotlight.spec.ts`, etc. Describe blocks named after unit under test. `it('should X when Y')` pattern throughout.
- [x] **VIII. Test Anatomy** — AAA pattern in every test. `beforeEach` used for DB setup in integration tests via `createTestDb()`. Each test independently runnable.
- [x] **IX. Mocking & Test Data** — `auth()` mocked via `jest.mock('@/auth')` in unit tests. DB injected via `dbInstance` parameter. `Date.now()` and `new Date()` stubbed with `jest.useFakeTimers()` for month-boundary tests.
- [x] **X. Quality Criteria** — No tautological assertions. Each test covers one behaviour. Spotlight resolution algorithm is a pure function with well-defined cases; high mutation score expected.
- [x] **XI. Tools & Frameworks** — All existing npm scripts (`typecheck`, `lint`, `test:unit`, `test:integration`) work unchanged. No new scripts needed.

*No constitution violations detected. No Complexity Tracking entries required.*

## Project Structure

### Documentation (this feature)

```text
specs/009-idea-spotlight/
├── plan.md              ← this file
├── research.md          ← Phase 0 research (created)
├── data-model.md        ← Phase 1 design (created)
├── quickstart.md        ← Phase 1 implementation guide (created)
├── contracts/
│   └── spotlight-api.md ← Phase 1 contract (created)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT yet created)
```

### Source Code Layout

```text
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts                         # MODIFY — add spotlightPicks table + types
│   │   └── migrations/
│   │       └── 0006_spotlight_picks.sql      # NEW — spotlight_picks DDL
│   └── actions/
│       └── spotlight.ts                      # NEW — getSpotlightData, pin/unpin actions
├── components/
│   └── dashboard/
│       ├── SpotlightCard.tsx                 # NEW — P1/P4 spotlight display
│       ├── RecentlyApprovedFeed.tsx          # NEW — P2 approved ideas list
│       └── MonthlyActivityStrip.tsx          # NEW — P3 month counts
└── app/
    └── (portal)/
        └── home/
            └── page.tsx                      # MODIFY — add spotlight sections
        └── admin/
            └── page.tsx                      # MODIFY — pass currentPickIdeaId prop

src/components/admin/
└── AdminIdeaList.tsx                         # MODIFY — add pin/unpin form actions

tests/
├── unit/
│   └── components/
│       └── dashboard/
│           ├── SpotlightCard.test.tsx        # NEW
│           ├── RecentlyApprovedFeed.test.tsx # NEW
│           └── MonthlyActivityStrip.test.tsx # NEW
└── integration/
│   └── spotlight/
│       ├── getSpotlightData.test.ts          # NEW
│       └── pinEditorsPick.test.ts            # NEW
└── e2e/
    ├── ideas/
    │   └── submitter-sees-spotlight.spec.ts  # NEW
    └── admin/
        └── admin-pins-editors-pick.spec.ts   # NEW
```

**Structure Decision**: Single Next.js App Router project. Server actions in `src/lib/actions/`; RSC components in `src/components/dashboard/`; DB mutations via Drizzle ORM. No backend/frontend split needed — SSR handles all data fetching.

## Complexity Tracking

*No constitution violations. No entries required.*
