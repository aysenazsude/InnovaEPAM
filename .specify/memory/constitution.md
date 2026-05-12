<!--
SYNC IMPACT REPORT
==================
Version change: 1.3.0 → 1.4.0
Bump type: MINOR (final Testing Principle XI added)
Last amended: 2026-05-13

Added sections:
  - Testing Principles: XI. Tools & Frameworks (REFERENCE)
    Subsections: Static Analysis, Unit/Integration Testing, E2E Testing,
                 Coverage & Quality, Execution Commands, Pre-commit Hook, CI/CD Pipeline

Modified sections:
  - Version / Last Amended lines updated

Templates requiring updates:
  - .specify/templates/plan-template.md  ✅ (Constitution Check gates: added XI)
  - .specify/templates/spec-template.md  ✅ (no principle-breaking changes)
  - .specify/templates/tasks-template.md ✅ (no principle-breaking changes)

Deferred items: None — all 11 principles (I–XI) are fully defined.
  Testing Principles complete: IV–XI (8 sections as originally planned).
-->

# innovaEPAM Constitution

## Core Principles

### I. Clean Code (NON-NEGOTIABLE)

Every module, component, and function MUST be written to be readable first and clever second.
Rules:
- Functions MUST have a single, clearly named responsibility; names must reveal intent.
- Files MUST NOT exceed 300 lines; components beyond that threshold MUST be decomposed.
- Magic numbers and inline strings MUST be extracted into named constants.
- Dead code, commented-out blocks, and unreachable branches MUST be removed before merge.
- All code MUST pass the project linter (`eslint`) and formatter (`prettier`) with zero warnings.

**Rationale**: Readable code reduces onboarding time, lowers defect rates, and keeps the
codebase maintainable as the team grows. Complexity that cannot be explained simply MUST
not be introduced.

### II. Simple & Responsive UI/UX (NON-NEGOTIABLE)

Every user-facing screen MUST be functionally usable and visually coherent at all
standard viewport widths (mobile ≥ 320px, tablet ≥ 768px, desktop ≥ 1280px).
Rules:
- Layouts MUST be built with Tailwind CSS utility classes; custom CSS MUST be a last resort.
- Components MUST use semantic HTML elements (`<nav>`, `<main>`, `<section>`, `<button>`, etc.).
- Interactive elements MUST meet WCAG 2.1 AA contrast and focus-indicator requirements.
- UI flows MUST require the minimum number of steps to accomplish a user goal (YAGNI for screens).
- Animations and transitions MUST respect the `prefers-reduced-motion` media query.

**Rationale**: A responsive, accessible interface ensures the product works for every user on
every device without bespoke workarounds. Simplicity in UI reduces cognitive load and support cost.

### III. Minimal Dependencies

The project MUST NOT add a third-party package unless no reasonable in-project solution exists
and the package is actively maintained.
Rules:
- Every new dependency MUST be approved via pull-request discussion before installation.
- The approved core stack is: **Next.js**, **React**, **Tailwind CSS**. Additions beyond this
  set require explicit justification documented in the PR description.
- `devDependencies` MUST be kept separate from `dependencies`; runtime bundles MUST NOT
  include development-only packages.
- Dependencies MUST be pinned to exact versions in `package.json`; ranges (`^`, `~`) are
  prohibited in production dependencies.
- Unused dependencies MUST be removed immediately when the feature that introduced them is
  removed or superseded.

**Rationale**: Each additional dependency is a potential security surface, a source of breaking
upgrades, and an increase in bundle size. A lean dependency tree is easier to audit and upgrade.

## Testing Principles

### IV. Testing Philosophy (NON-NEGOTIABLE)

All production code MUST be preceded by a failing test. The RED-GREEN-REFACTOR cycle is the
only accepted development loop for business logic, services, and API handlers.
Rules:
- Tests MUST be written BEFORE implementation; retrofitted tests are not acceptable for
  new features or bug fixes.
- Tests MUST be generated from the specification (acceptance criteria, data contracts), not
  reverse-engineered from existing implementation.
- RED — write a failing test that describes the desired behavior exactly.
- GREEN — write the minimum implementation code to make the test pass; no more.
- REFACTOR — clean up code and tests while keeping all tests green.
- Test files MUST live adjacent to the unit under test (`*.test.ts` / `*.spec.ts`) for
  unit/component tests, and inside `tests/` subdirectories for integration and E2E suites.
- Tests MUST be deterministic; flaky tests MUST be fixed or deleted — not skipped
  indefinitely.

**Rationale**: TDD forces design clarity before implementation, catches regressions at
the point of introduction, and produces a living specification. Code that cannot be tested
easily is a signal of poor design, not of insufficient test tooling.

### V. Coverage Requirements

The Testing Pyramid distribution MUST be maintained at approximately 70% unit,
20% integration, and 10% E2E. Coverage targets MUST be enforced in CI and block merge
when not met.
Rules:
- **Unit tests** (Jest + React Testing Library): cover all services, custom hooks,
  utilities, and business logic in isolation; mock all external dependencies.
- **Integration tests** (Jest): cover all Next.js API route handlers, server actions, and
  database operations end-to-end within the process boundary (real DB / test doubles for
  external services).
- **E2E tests** (Playwright): cover critical user workflows only (login, primary CRUD flows,
  payment paths); MUST NOT duplicate assertions already covered by unit or integration tests.
- **Static analysis**: TypeScript strict mode (`"strict": true`) MUST report zero errors;
  ESLint MUST report zero warnings or errors on every commit.
- **Coverage targets** (enforced via Jest `--coverage` in CI):
  - Line coverage: ≥ 80%
  - Branch coverage: ≥ 75%
  - Mutation score: ≥ 75% (measured via Stryker when mutation testing is run)
- Coverage MUST NOT drop below thresholds when averaged across the codebase;
  per-file exemptions require a documented `/* istanbul ignore */` comment with a reason.

**Rationale**: Quantified coverage targets prevent coverage theater while ensuring
meaningful test distribution. The pyramid shape keeps the suite fast: unit tests run in
milliseconds, integration tests in seconds, and E2E in minutes.

### VI. Test Types & Organization

Every test file MUST belong to exactly one test layer and MUST be placed in the directory
that corresponds to that layer. Mixing test layers within a single file is prohibited.
Rules:
- **Unit tests** — `tests/unit/**/*.test.ts` / `*.test.tsx`, mirroring the `src/`
  directory structure one-for-one (e.g., `src/lib/formatDate.ts` →
  `tests/unit/lib/formatDate.test.ts`).
- **Integration tests** — `tests/integration/**/*.test.ts`, grouped by feature domain
  (e.g., `tests/integration/auth/`, `tests/integration/evaluations/`).
- **E2E tests** — `tests/e2e/**/*.spec.ts`, grouped by user journey
  (e.g., `tests/e2e/candidate-applies/`, `tests/e2e/evaluator-reviews/`).
- One test file MUST correspond to exactly one source file for unit tests; a 1-to-1
  mapping MUST be maintained and enforced in code review.
- Playwright configuration MUST point exclusively at `tests/e2e/`; Jest configuration
  MUST explicitly exclude `tests/e2e/` to prevent runner cross-contamination.

**Rationale**: A predictable, enforced directory layout makes it trivially easy to find the
test for any source file, ensures the correct runner executes each test type, and prevents
accidental inclusion of slow E2E tests in the fast Jest suite.

### VII. Naming Conventions

Test file and test case names MUST be self-documenting. A developer MUST be able to infer
the intent of any test without reading its body.
Rules:
- **Unit / integration test files**: `ComponentName.test.ts` for pure logic modules;
  `ComponentName.test.tsx` for React components.
- **E2E test files**: `user-journey-name.spec.ts` in kebab-case
  (e.g., `candidate-submits-application.spec.ts`).
- **Test suites** (`describe` blocks): named after the module or component under test —
  `describe('ComponentName', () => { ... })` or `describe('functionName', () => { ... })`.
- **Test cases** (`it` / `test` blocks): MUST follow the pattern
  `it('should <expected outcome> when <condition>', ...)` — the subject is always implicit
  (the describe block provides it).
- Nested `describe` blocks are permitted for logical grouping (e.g., by method or state)
  but MUST NOT exceed two levels of nesting.
- `test.todo(...)` is permitted for planned-but-not-yet-written tests; a `// TODO` comment
  MUST accompany it explaining what must be covered.

**Rationale**: Consistent naming turns the test output into a readable specification. When
a test fails in CI, the name alone must communicate what broke and under what conditions
without requiring the developer to open the file.

### VIII. Test Anatomy

Every test MUST be written in the Arrange-Act-Assert (AAA) pattern and MUST be
fully independent of every other test in the suite.
Rules:
- **Arrange** — set up all inputs, mocks, and preconditions at the start of the test body
  or in a `beforeEach` scoped to the nearest `describe` block.
- **Act** — invoke exactly one unit of behavior per test (one function call, one user
  event, one API request).
- **Assert** — verify the outcome with the minimum number of assertions needed to confirm
  the behavior; do not assert implementation details.
- `beforeEach` MUST be used for test-specific setup; `beforeAll` is prohibited in unit
  tests and requires a documented justification in integration tests (e.g., expensive DB
  seed that is read-only across all cases in the file).
- Each test MUST be runnable in isolation (i.e., `it.only(...)` on any single test must
  still produce a meaningful, passing or failing result).
- Shared global state (module-level variables mutated across tests) is prohibited; use
  factory functions or `beforeEach` reset to establish fresh state per test.
- `jest.mock(...)` declarations MUST appear at the top of the file, before any `describe`
  block, and MUST be cleared/restored via `jest.clearAllMocks()` in `afterEach` or via
  `clearMocks: true` in `jest.config.ts`.

**Rationale**: The AAA pattern produces tests that are easy to read and diagnose. Isolation
ensures that test execution order does not affect results, making the suite reliable in
both local and CI environments.

### IX. Mocking & Test Data

Test doubles MUST be used precisely: the right double for the right boundary. Mocking code
you own is prohibited; over-mocking hides integration bugs and undermines the value of
the test suite.
Rules:
- **Mock** (verify interaction): external services and third-party APIs that cross a
  network boundary — email providers, payment gateways, analytics, OAuth providers.
  Use `jest.mock(...)` with explicit return values; never let real HTTP calls fire in
  unit or integration tests.
- **Stub** (control return value): time-dependent functions — replace `Date.now()`,
  `new Date()`, `setTimeout`, and `setInterval` with Jest fake timers
  (`jest.useFakeTimers()`) scoped to the test file; always restore with
  `jest.useRealTimers()` in `afterEach`.
- **Fake** (lightweight working implementation): in-memory data store for unit tests
  that need repository-layer isolation (e.g., a `Map`-backed fake repository); fakes
  MUST implement the same TypeScript interface as the real implementation.
- **Fixtures** — complex, realistic data objects (users, evaluations, attachments) MUST
  be extracted into fixture files under `tests/fixtures/` and imported; inline object
  literals longer than ~5 fields are prohibited inside test bodies.
- **Test helper factories** — repeated setup logic MUST be extracted into named factory
  functions (e.g., `createTestUser(overrides?)`, `setupMockAPI(routes)`) placed in
  `tests/helpers/`; factory functions MUST accept partial overrides via spread so
  individual tests can vary only the field under test.
- **Do NOT mock**: modules you own (services, utilities, hooks, components); mocking
  own code couples tests to implementation. Test those units directly or use a fake.
- Dependencies injected via function arguments or constructor MUST be typed against
  interfaces, not concrete classes, to enable fakes without `jest.mock`.

**Rationale**: Precise use of test doubles keeps unit tests fast and isolated while
ensuring integration tests exercise real contracts. Banning mocks of owned code forces
good design (dependency inversion) and prevents tests that pass while the real integration
is broken.

### X. Quality Criteria (NON-NEGOTIABLE)

A test that does not improve confidence in the correctness of the code MUST NOT be merged.
Every merged test MUST meet all of the following quality criteria.

**What makes a good test:**
- **Tests observable behavior, not implementation details** — assertions target public
  return values, rendered output, emitted events, and side effects on collaborators;
  never assert on private fields, internal state, or which private method was called.
- **Meaningful assertions** — every `expect(...)` MUST compare the actual value to an
  independently known expected value; tautological assertions (`expect(x).toBe(x)`,
  `expect(true).toBe(true)`) are banned.
- **Single responsibility** — each `it(...)` block tests exactly one behavior; multiple
  unrelated assertions in a single test MUST be split into separate tests.
- **Fast** — unit tests MUST complete in under 1 second per test; integration tests MUST
  complete in under 5 seconds per test. Tests exceeding these limits MUST be profiled and
  optimized or reclassified.
- **Deterministic** — the same test run with the same inputs MUST always produce the same
  result; any source of non-determinism (random data, real clocks, network calls) MUST be
  eliminated via stubs or fakes (see Principle IX).

**Quality gates (enforced in CI):**
- **Mutation score ≥ 75%** — measured by **Stryker** (`stryker run`); mutations that
  survive indicate assertions are too weak or coverage is superficial. Stryker config
  MUST be committed at `stryker.config.ts` in the project root.
- **No tautological assertions** — ESLint rules `jest/valid-expect` and
  `jest/no-identical-title` MUST be enabled via `eslint-plugin-jest`; patterns such as
  `expect(received).toBe(received)` will be caught at lint time.
- **All expected values (oracles) validated by a human** — expected values MUST be derived
  from the specification or domain knowledge, not copied from the implementation output.
  Code-review checklist MUST include: "Are expected values independently known?"
- **Coverage targets** (see Principle V): ≥ 80% line, ≥ 75% branch — these are a floor,
  not a goal; high coverage with weak assertions is worthless without a passing mutation
  score.

**Anti-patterns (any of these will block PR approval):**
- Testing private methods or internal state (access via `(obj as any).privateField`).
- Interdependent tests — test suites that pass only when run in a specific order.
- Brittle tests — tests that fail after a pure refactor with no behavior change.
- Flaky tests — tests with intermittent pass/fail; MUST be fixed within one sprint or
  deleted; a tracking issue MUST be opened immediately on detection.
- Tests without assertions — a test with no `expect(...)` call MUST NOT exist;
  `expect.assertions(n)` MUST be used for async tests to guard against silent resolution.
- Copy-pasted test logic — duplicated setup or assertion blocks MUST be extracted into
  helper functions in `tests/helpers/` (see Principle IX).

**Rationale**: High mutation score is the only reliable proxy for test suite effectiveness.
Coverage alone is a necessary but not sufficient metric. Anti-pattern enforcement through
automated gates and structured code review ensures the test suite remains an asset rather
than a liability.

### XI. Tools & Frameworks (REFERENCE)

This principle is the canonical, versioned record of every tool in the test toolchain.
Any change to a tool, version, or command MUST be reflected here via a constitution
amendment before the change lands in CI.

#### Static Analysis

| Tool | Role | Configuration |
|---|---|---|
| **TypeScript** (`tsc --noEmit`) | Type checking | `tsconfig.json` — `"strict": true` (all strict flags enabled) |
| **ESLint** | Linting | `.eslintrc.json` — extends `next/core-web-vitals`; `eslint-plugin-jest` enabled with `recommended` + `jest/valid-expect`, `jest/no-identical-title` |
| **Prettier** | Formatting | `.prettierrc` — committed to repo root; enforced via `eslint-plugin-prettier` |

#### Unit & Integration Testing

| Concern | Tool | Notes |
|---|---|---|
| **Framework** | **Jest** (latest LTS) | Config at `jest.config.ts`; `testEnvironment: 'jsdom'` for component tests, `'node'` for pure TS |
| **Assertion** | **Jest built-in** (`expect`) + `@testing-library/jest-dom` | Extends `expect` with DOM matchers (`toBeInTheDocument`, `toHaveValue`, etc.) |
| **Component rendering** | **React Testing Library** | Prefer `screen` queries; `userEvent` over `fireEvent` for interaction |
| **Mocking** | **Jest built-in** (`jest.mock`, `jest.fn`, `jest.spyOn`, `jest.useFakeTimers`) | `clearMocks: true` set globally in `jest.config.ts` |

#### E2E Testing

| Concern | Tool | Notes |
|---|---|---|
| **Framework** | **Playwright** (latest stable) | Config at `playwright.config.ts`; tests in `tests/e2e/` |
| **Browsers** | Chromium (required), Firefox + WebKit (CI only) | Local runs default to Chromium |
| **AI-native automation** | **Stagehand** (optional) | May be used for exploratory / AI-driven browser workflows; MUST NOT replace deterministic Playwright specs for critical paths |

#### Coverage & Quality

| Tool | Purpose | Threshold |
|---|---|---|
| **Jest `--coverage`** (Istanbul/V8) | Line & branch coverage | ≥ 80% line, ≥ 75% branch — enforced via `coverageThreshold` in `jest.config.ts` |
| **Stryker** (`@stryker-mutator/jest-runner`) | Mutation testing | ≥ 75% mutation score — config at `stryker.config.ts` |

#### Execution Commands (npm scripts — MUST exist in `package.json`)

```jsonc
// package.json scripts (canonical — update here AND in package.json together)
{
  "typecheck":       "tsc --noEmit",
  "lint":            "eslint . --max-warnings 0",
  "test":            "jest --runInBand",
  "test:unit":       "jest --testPathPattern='tests/unit'",
  "test:integration":"jest --testPathPattern='tests/integration'",
  "test:e2e":        "playwright test",
  "test:coverage":   "jest --coverage",
  "test:mutation":   "stryker run"
}
```

All commands MUST be runnable via `npm run <script>`. CI MUST invoke them in the order
shown in the CI/CD section below; no ad-hoc `npx` invocations are permitted.

#### Pre-commit Hook (Husky + lint-staged)

Runs automatically on every `git commit` via Husky. Blocks commit on failure.

```
1. tsc --noEmit                          (typecheck — whole project)
2. eslint --max-warnings 0 <staged>      (lint staged files only)
3. jest --testPathPattern='tests/unit'   (unit tests — fast gate)
```

Configuration MUST live in `.husky/pre-commit` and `lint-staged` config in
`package.json`. Bypassing with `--no-verify` is prohibited outside of documented
emergency procedures (break-glass commits MUST be followed by a remediation ticket).

#### CI/CD Pipeline (GitHub Actions — `main` branch)

Runs on every push and pull request targeting `main`. All steps are required;
failure in any step blocks merge.

```
Step 1  — typecheck:   npm run typecheck
Step 2  — lint:        npm run lint
Step 3  — unit tests:  npm run test:unit
Step 4  — integration: npm run test:integration
Step 5  — coverage:    npm run test:coverage      (must meet thresholds)
Step 6  — E2E:         npm run test:e2e           (Playwright, all browsers)
Step 7  — mutation:    npm run test:mutation       (Stryker, main branch only)
```

Step 7 (mutation) runs on `main` pushes only (not on every PR) due to runtime cost;
PRs MUST pass Steps 1–6. A weekly scheduled run executes all 7 steps.

**Rationale**: Canonical, versioned toolchain commands eliminate "works on my machine"
discrepancies. Documented pre-commit and CI sequences ensure every developer and every
pipeline applies the same quality gates in the same order.

## Technology Stack

- **Framework**: Next.js (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS — utility-first, no CSS-in-JS runtime
- **Language**: TypeScript — strict mode enabled (`"strict": true` in `tsconfig.json`)
- **Package Manager**: npm (lock file MUST be committed)
- **Linting / Formatting**: ESLint + Prettier (configs committed to repository root)
- **Testing**: Jest + React Testing Library (unit/component), Playwright (e2e), Stryker (mutation)

No deviation from this stack is permitted without a constitution amendment.

## Development Workflow

- Feature branches MUST follow the naming convention `###-short-description`
  (e.g., `001-auth-flow`).
- Every PR MUST include passing CI (lint, type-check, tests) before review.
- PR descriptions MUST reference the relevant spec and list any dependency changes.
- Code reviews MUST verify compliance with all Core Principles and Testing Principles before approval.
- Breaking changes to shared components or APIs MUST be coordinated across all
  affected features before merge.
- CI MUST enforce Jest coverage thresholds (≥80% line, ≥75% branch) and TypeScript/ESLint
  zero-error gates on every PR. PRs that drop coverage below thresholds MUST NOT be merged.

## Governance

This constitution supersedes all other project guidance documents. Any conflict between this
constitution and a spec, plan, or task document is resolved in favor of the constitution.

**Amendment procedure**:
1. Open a PR with the proposed change to `.specify/memory/constitution.md`.
2. Include a version bump rationale following semantic versioning:
   - MAJOR — principle removal or incompatible redefinition.
   - MINOR — new principle or materially expanded guidance.
   - PATCH — clarification, wording, or typo fix.
3. All active contributors MUST acknowledge the amendment before merge.
4. Propagate updates to dependent templates immediately after merge.

All PRs and code reviews MUST verify compliance with all Core Principles and Testing Principles.
Complexity introductions MUST be justified in writing within the PR description.

**Version**: 1.4.0 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-13
