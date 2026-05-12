# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **I. Clean Code** — Components are decomposed to single responsibilities; no file exceeds 300 lines; linter/formatter pass with zero warnings.
- [ ] **II. Simple & Responsive UI/UX** — All screens verified at mobile (≥320px), tablet (≥768px), desktop (≥1280px); Tailwind CSS used for layout; semantic HTML; WCAG 2.1 AA contrast met.
- [ ] **III. Minimal Dependencies** — No new packages beyond Next.js / React / Tailwind added without PR approval; all runtime deps pinned to exact versions.
- [ ] **IV. Testing Philosophy** — Tests written BEFORE implementation (TDD); RED-GREEN-REFACTOR cycle followed; test files co-located with units under test or in `tests/` for integration/E2E.
- [ ] **V. Coverage Requirements** — Jest coverage meets ≥80% line, ≥75% branch; TypeScript strict and ESLint report zero errors/warnings; E2E (Playwright) covers only critical user workflows.
- [ ] **VI. Test Types & Organization** — Unit tests in `tests/unit/**/*.test.ts(x)` mirroring `src/`; integration in `tests/integration/**/*.test.ts`; E2E in `tests/e2e/**/*.spec.ts`; 1-to-1 file mapping for unit tests.
- [ ] **VII. Naming Conventions** — Test files named `ComponentName.test.ts(x)` / `user-journey.spec.ts`; describe blocks named after the unit under test; `it('should X when Y', ...)` pattern used throughout.
- [ ] **VIII. Test Anatomy** — AAA pattern in every test; `beforeEach` used for setup (not `beforeAll` in unit tests); each test independently runnable; no shared mutable global state.
- [ ] **IX. Mocking & Test Data** — External services mocked with `jest.mock`; time stubbed via `jest.useFakeTimers()`; fakes implement TS interfaces; fixtures in `tests/fixtures/`; helpers in `tests/helpers/`; own code NOT mocked.
- [ ] **X. Quality Criteria** — No tautological assertions; each test covers one behavior; unit tests <1s, integration <5s; Stryker mutation score ≥75%; no anti-patterns (flaky, brittle, assertion-free, interdependent, copy-pasted).
- [ ] **XI. Tools & Frameworks** — `npm run typecheck` (tsc), `npm run lint` (ESLint 0 warnings), `npm run test:unit/integration/e2e/coverage/mutation` all exist; Husky pre-commit runs typecheck + lint + unit; CI Steps 1–6 pass on every PR.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
