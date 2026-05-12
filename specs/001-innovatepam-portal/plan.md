# Implementation Plan: InnovatEPAM Portal — Phase 1 MVP ✅ COMPLETED

**Branch**: `001-innovatepam-portal` | **Completed**: 2026-05-13 | **Spec**: [spec.md](./spec.md)  
**Implementation Log**: [implement.md](./implement.md)  
**Input**: Feature specification from `/specs/001-innovatepam-portal/spec.md`

## Summary

Build a Phase 1 internal innovation portal for EPAM employees — allowing authenticated submitters to register, log in, submit ideas (with one file attachment) and track their status; and allowing admins to evaluate ideas (accept/reject with a mandatory comment). Implemented as a Next.js 15 App Router application with TypeScript strict mode, Tailwind CSS v4, SQLite + Drizzle ORM for persistence, NextAuth.js for session management, and shadcn/ui for accessible UI components.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode, `"strict": true` in `tsconfig.json`); Node.js 20 LTS  
**Primary Dependencies**: Next.js 15 (App Router), React 19, NextAuth.js v5, Drizzle ORM + `better-sqlite3`, shadcn/ui components (copied into `src/components/ui/`)  
**Storage**: SQLite (WAL mode) via `better-sqlite3`; file: `./data/innovatepam.db` (path via `DATABASE_URL` env var); file uploads stored on disk at `./data/uploads/` (path via `UPLOAD_DIR` env var)  
**Testing**: Jest + React Testing Library (unit/component), Playwright (E2E), Stryker (mutation); `npm run test:unit / test:integration / test:e2e / test:coverage / test:mutation`  
**Target Platform**: Node.js server (no edge runtime); deployable as a standard Next.js Node server  
**Project Type**: Web application (full-stack Next.js — server components + server actions + API routes)  
**Performance Goals**: All core pages fully interactive in ≤ 2 s on ≥ 10 Mbps broadband; status updates visible to submitter within 5 s under normal load  
**Constraints**: `better-sqlite3` requires Node.js runtime — no `export const runtime = 'edge'` anywhere; no external cloud services (no SSO, no SMTP, no cloud storage) in Phase 1  
**Scale/Scope**: Internal team-scale portal; ~500 concurrent users; 4 core user flows; 5 screens; Phase 1 only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Clean Code** — Server actions, lib utilities, and route handlers each have single responsibilities; 300-line file ceiling enforced by ESLint rule; ESLint + Prettier run in CI with zero-warning gate.
- [x] **II. Simple & Responsive UI/UX** — All 5 screens (login, register, submission form, idea listing, admin dashboard) verified at ≥320px / ≥768px / ≥1280px; Tailwind v4 utility-first layout; semantic HTML (`<main>`, `<section>`, `<form>`, `<button>`); shadcn/ui components meet WCAG 2.1 AA contrast; `prefers-reduced-motion` respected.
- [x] **III. Minimal Dependencies** — Runtime deps: Next.js, React, NextAuth.js, drizzle-orm, better-sqlite3, bcryptjs; shadcn/ui components are copied source (not a package import). All pinned to exact versions in `package.json`. No ranges (`^`, `~`).
- [x] **IV. Testing Philosophy** — TDD RED-GREEN-REFACTOR mandated; all test expectations derived from spec acceptance scenarios, not implementation; `tests/` directory structure pre-defined in spec.
- [x] **V. Coverage Requirements** — Jest `coverageThreshold` set to 80% line / 75% branch in `jest.config.ts`; Stryker configured at `stryker.config.ts` targeting ≥75% mutation score; TypeScript strict + ESLint 0-warning gates block CI.
- [x] **VI. Test Types & Organization** — Unit: `tests/unit/**/*.test.ts(x)` mirroring `src/`; Integration: `tests/integration/**/*.test.ts` by domain; E2E: `tests/e2e/**/*.spec.ts` by user journey; Playwright excluded from Jest config.
- [x] **VII. Naming Conventions** — `ComponentName.test.ts(x)` for unit/integration; `user-journey-name.spec.ts` for E2E; `describe('name')` + `it('should X when Y')` throughout; max 2 `describe` nesting levels.
- [x] **VIII. Test Anatomy** — AAA pattern enforced in code review; `beforeEach` for per-test setup; `beforeAll` banned in unit tests; each `it` independently runnable; `clearMocks: true` in `jest.config.ts`.
- [x] **IX. Mocking & Test Data** — External services (email, payment N/A in Phase 1) mocked via `jest.mock`; `Date.now()` / timers stubbed with `jest.useFakeTimers()`; fakes implement TS interfaces (e.g., `IUserRepository`); fixtures in `tests/fixtures/`; helpers in `tests/helpers/`; own modules not mocked.
- [x] **X. Quality Criteria** — `eslint-plugin-jest` (`jest/valid-expect`, `jest/no-identical-title`) blocks tautological assertions; unit <1 s, integration <5 s enforced in CI; anti-pattern checklist in PR template.
- [x] **XI. Tools & Frameworks** — All 8 `npm run` scripts defined in `package.json`; Husky pre-commit (typecheck → lint → `test:unit`); CI Steps 1–6 required on every PR; Stryker (Step 7) on `main` push only.

## Project Structure

### Documentation (this feature)

```text
specs/001-innovatepam-portal/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — entity definitions & Drizzle schema
├── quickstart.md        # Phase 1 — developer setup guide
├── contracts/           # Phase 1 — API contracts
│   ├── attachments-api.md
│   └── evaluation-api.md
└── tasks.md             # Phase 2 — generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router pages & layouts
│   ├── layout.tsx                # Root layout (fonts, globals, SessionProvider)
│   ├── page.tsx                  # Public root → redirect to /login
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── ideas/
│   │   ├── page.tsx              # Submitter idea listing (server component)
│   │   └── new/page.tsx          # Idea submission form
│   └── admin/
│       ├── page.tsx              # Admin dashboard — all ideas, filterable by status
│       └── [id]/page.tsx         # Idea detail + accept/reject panel
├── components/
│   ├── ui/                       # shadcn/ui copied components (Button, Input, …)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── ideas/
│   │   ├── IdeaCard.tsx
│   │   ├── IdeaList.tsx
│   │   ├── IdeaSubmissionForm.tsx
│   │   └── AttachmentUploader.tsx
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── IdeaDetail.tsx
│       └── EvaluationPanel.tsx
├── lib/
│   ├── auth/
│   │   ├── passwordValidator.ts  # Password strength rules (unit-testable pure fn)
│   │   ├── lockoutPolicy.ts      # Failed-attempt counter & lock logic
│   │   └── sessionManager.ts     # returnUrl, expiry helpers
│   ├── ideas/
│   │   ├── ideaValidator.ts      # Field length/required/category validation
│   │   └── statusMachine.ts      # Valid status transitions
│   ├── attachments/
│   │   └── attachmentValidator.ts# MIME type + size + single-file enforcement
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (users, ideas, attachments, idea_categories)
│   │   ├── client.ts             # better-sqlite3 connection + WAL pragma
│   │   └── migrations/           # drizzle-kit migration files
│   └── constants.ts              # FILE_SIZE_LIMIT, ALLOWED_MIME_TYPES, SESSION_DURATION_MS
├── actions/                      # Next.js Server Actions
│   ├── auth.ts                   # register, login, logout server actions
│   ├── ideas.ts                  # submitIdea, listMyIdeas, listAllIdeas
│   ├── evaluation.ts             # openIdea (→ under_review), evaluateIdea (accept/reject)
│   └── attachments.ts            # uploadAttachment, removeAttachment
├── auth.ts                       # NextAuth.js v5 configuration
└── styles/
    └── globals.css               # Tailwind v4 @import + @theme EPAM brand tokens

tests/
├── unit/                         # Mirrors src/lib/ — Jest, pure logic
│   ├── lib/auth/
│   │   ├── passwordValidator.test.ts
│   │   ├── lockoutPolicy.test.ts
│   │   └── sessionManager.test.ts
│   ├── lib/ideas/
│   │   ├── ideaValidator.test.ts
│   │   └── statusMachine.test.ts
│   └── lib/attachments/
│       └── attachmentValidator.test.ts
├── integration/                  # Server actions + DB — Jest, real SQLite test DB
│   ├── auth/
│   │   ├── register.test.ts
│   │   ├── login.test.ts
│   │   └── session.test.ts
│   ├── ideas/
│   │   ├── submit.test.ts
│   │   └── list.test.ts
│   ├── evaluation/
│   │   └── evaluate.test.ts
│   └── attachments/
│       └── upload.test.ts
├── e2e/                          # Critical user journeys — Playwright
│   ├── auth/
│   │   ├── submitter-registers-and-logs-in.spec.ts
│   │   └── account-lockout.spec.ts
│   ├── ideas/
│   │   └── submitter-submits-idea-with-attachment.spec.ts
│   └── evaluation/
│       └── admin-evaluates-idea.spec.ts
├── fixtures/
│   ├── users.ts                  # createSubmitter(), createAdmin()
│   ├── ideas.ts                  # createIdea(status?, overrides?)
│   └── attachments.ts            # createAttachment(type?, sizeBytes?)
└── helpers/
    ├── authHelpers.ts             # loginAs(role), registerUser(overrides?)
    ├── ideaHelpers.ts             # submitIdea(overrides?), getIdeaById(id)
    └── attachmentHelpers.ts       # attachFile(type, sizeBytes)
```

**Structure Decision**: Next.js App Router single-project layout. All server logic lives in `src/lib/` (pure functions) and `src/actions/` (server actions), making server-side modules independently testable without rendering. The `tests/` directory mirrors `src/lib/` exactly for unit tests and groups by feature domain for integration tests, per Constitution Principle VI.

## Complexity Tracking

> No Constitution violations. No justifications required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |

---

## Phase 1 Completion Status

| Area | Status | Notes |
|------|--------|-------|
| Auth (register/login/logout/lockout) | ✅ Done | NextAuth v5, bcrypt-12, 5-attempt lockout |
| Idea submission with optional attachment | ✅ Done | Single-step form; validates file in server action |
| Submitter idea listing & detail | ✅ Done | Status badges, attachment download |
| Admin dashboard & evaluate | ✅ Done | Accept/reject with mandatory comment, status machine |
| Edge Runtime compatibility | ✅ Done | `auth.config.ts` split; `middleware.ts` uses Edge-safe config |
| Test coverage | ✅ Done | 96.93% stmts / 82.03% branches — above thresholds |
| TypeScript strict | ✅ Done | Zero errors |

---

## Phase 2 — Suggested Next Steps

> These items are out of scope for Phase 1 but represent natural follow-on work.

### Notifications
- Email notifications to submitters when their idea status changes (accepted/rejected)
- Consider `nodemailer` + SMTP or a transactional email provider (Resend, Postmark)

### Admin UX Improvements
- Idea search and full-text filter on the admin dashboard
- Pagination for the idea listing (both `/ideas` and `/admin`)
- Bulk status transitions (e.g. mark multiple ideas as under review)

### Submitter Enhancements
- Edit idea (title/description/category) while status is `submitted`
- Delete own idea while status is `submitted`
- Replace/remove attachment after upload while status is `submitted`

### Operations & Deployment
- Docker + `docker-compose.yml` for reproducible local setup
- GitHub Actions CI workflow (typecheck → lint → test:unit → test:integration → test:coverage → Playwright)
- Environment-specific `.env` validation at startup (e.g. `zod` schema check)
- Structured logging (pino) for server actions and API routes
- Database backup strategy for the SQLite file

### Security Hardening
- CSRF protection audit for all server actions
- Rate-limiting on `/api/auth/*` and `/api/attachments` endpoints
- Content-Security-Policy headers via `next.config.ts`
- Virus scanning for uploaded files (e.g. ClamAV sidecar)

### Performance
- Optimistic UI updates on status changes
- `React.Suspense` + streaming for idea listing pages
- `next/image` for any future image attachments

