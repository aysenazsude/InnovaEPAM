# Tasks: InnovatEPAM Portal — Phase 1 MVP

**Input**: Design documents from `/specs/001-innovatepam-portal/`
**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/)
**Arguments**: Update the test tasks following the Testing Principles from constitution.
**Constitution**: v1.4.0 — Testing Principles IV–XI applied throughout

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no in-phase dependencies)
- **[US#]**: User story label — required for Phase 3+ tasks
- No story label on Setup, Foundational, or Polish phases
- **TDD rule**: Within each user story phase, all `[test]` tasks MUST be written and confirmed failing (RED) before any implementation task begins

---

## Phase 1: Setup

**Purpose**: Project foundation, tooling, and test infrastructure configuration

- [X] T001 Initialise Next.js 15 project with TypeScript strict, App Router, Tailwind, ESLint (`npx create-next-app@latest --typescript --app --tailwind --eslint`) at repository root
- [X] T002 [P] Configure ESLint + Prettier: commit `.eslintrc.json` extending `next/core-web-vitals`; add `eslint-plugin-jest` with `recommended` ruleset + rules `jest/valid-expect` and `jest/no-identical-title` enabled; commit `.prettierrc`
- [X] T003 [P] Configure Tailwind CSS v4 `@theme` EPAM brand tokens (brand-500 `#0077cc`, accent-500 `#ff6600`, neutrals, shadcn/ui semantic aliases) in `src/styles/globals.css` per R-001
- [X] T004 [P] Initialise shadcn/ui (`npx shadcn@latest init`) and add Phase 1 components `button input textarea select badge card separator label alert skeleton` into `src/components/ui/`
- [X] T005 [P] Create `.env.example` with all required variables: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `UPLOAD_DIR`
- [X] T006 [P] Add `data/` to `.gitignore`; create `data/uploads/` directory; create `data/.gitkeep`
- [X] T007 [P] Create `jest.config.ts` at repo root: `testEnvironment: 'jsdom'` default (override to `'node'` for `tests/integration/`), `coverageThreshold` `{ global: { lines: 80, branches: 75 } }`, `clearMocks: true`, `setupFilesAfterEnv: ['@testing-library/jest-dom']`, `testPathIgnorePatterns: ['tests/e2e']`
- [X] T008 [P] Create `playwright.config.ts` at repo root: `testDir: 'tests/e2e'`, `projects` for Chromium (always) + Firefox + WebKit (CI only via `process.env.CI`), base URL `http://localhost:3000`
- [X] T009 [P] Create `stryker.config.ts` at repo root: `testRunner: '@stryker-mutator/jest-runner'`, `mutate: ['src/lib/**/*.ts']`, `thresholds: { high: 80, low: 75, break: 70 }`
- [X] T010 [P] Add all 8 canonical `npm run` scripts to `package.json` (`typecheck`, `lint`, `test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`, `test:mutation`); configure Husky + lint-staged (`typecheck` → `lint staged` → `test:unit` on pre-commit)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data, auth infrastructure, and shared test fixtures — ALL user stories blocked until complete

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Define all 4 Drizzle table schemas (`users`, `ideas`, `attachments`, `idea_categories`) in `src/lib/db/schema.ts` per data-model.md — UUID PKs, enums as TEXT, all NOT NULL constraints, FK declarations
- [X] T012 [P] Create DB singleton with WAL mode pragma (`PRAGMA journal_mode=WAL`) in `src/lib/db/index.ts`; export typed `db` instance; enforce Node.js runtime (add comment: no edge export)
- [X] T013 Generate initial Drizzle migration and embed `idea_categories` seed data (5 categories per data-model.md) in the migration file; verify `npx drizzle-kit migrate` creates `data/innovatepam.db` cleanly
- [X] T014 [P] Create `src/lib/constants.ts` — export `ALLOWED_MIME_TYPES` (5 MIME types), `FILE_SIZE_LIMIT` (10_485_760), `CATEGORIES` (5 slugs + display names), `PASSWORD_MIN_LENGTH` (8), `SESSION_MAX_AGE_SECONDS` (28_800), `LOCKOUT_ATTEMPTS` (5), `LOCKOUT_DURATION_SECONDS` (900)
- [X] T015 [P] Write failing unit tests for `storage.ts` in `tests/unit/lib/storage.test.ts` (RED: `saveFile` writes UUID-named file, returns relative path; `deleteFile` removes file; stub `fs` with `jest.mock('fs')`; each case in an independent `it` block), then implement `src/lib/storage.ts` — export `saveFile(buffer: Buffer, mimeType: string, uploadDir: string): string` and `deleteFile(storagePath: string, uploadDir: string): void`; pure functions with no DB coupling (GREEN)
- [X] T016 Configure NextAuth v5 credentials provider in `src/lib/auth.ts`: bcryptjs 12-round verify, lockout check via `lockoutPolicy`, role-based `signIn` redirect (`/ideas` | `/admin`), `maxAge: SESSION_MAX_AGE_SECONDS`
- [X] T017 Create `middleware.ts` at repo root: protect all `/(portal)` routes — unauthenticated requests redirect to `/login?returnUrl=<originalPath>`; pass `returnUrl` through on re-auth
- [X] T018 [P] Create `tests/fixtures/users.ts` — export `createSubmitter(overrides?: Partial<User>): User` and `createAdmin(overrides?: Partial<User>): User` with realistic defaults; all fields typed against `schema.ts` interfaces
- [X] T019 [P] Create `tests/fixtures/ideas.ts` — export `createIdea(status?: IdeaStatus, overrides?: Partial<Idea>): Idea` covering all 4 status values; `createIdea('submitted')` is the default
- [X] T020 [P] Create `tests/fixtures/attachments.ts` — export `createAttachment(mimeType?: string, sizeBytes?: number, overrides?: Partial<Attachment>): Attachment`; defaults to a valid PDF under 10 MB
- [X] T021 [P] Create `tests/helpers/authHelpers.ts` (`loginAs(role)`, `registerUser(overrides?)`), `tests/helpers/ideaHelpers.ts` (`submitIdea(overrides?)`, `getIdeaById(id)`), `tests/helpers/attachmentHelpers.ts` (`attachFile(mimeType, sizeBytes)`)

**Checkpoint**: Foundation complete — all Phase 3+ stories can begin; test fixtures and helpers ready for use

---

## Phase 3: User Story 1 — Register and Log In (Priority: P1) 🎯 MVP

**Goal**: Any visitor can create an account and log in; role determines home page; brute-force lockout and 8-hour session enforced.

**Independent Test**: Visit portal unauthenticated → redirected to `/login` → register new account → log in → land on `/ideas` (submitter) or `/admin` (admin) → log out → protected pages redirect to login again.

### Unit Tests — User Story 1 *(write first — must FAIL before T028)*

- [X] T022 [P] [US1] Write failing unit tests for `passwordValidator` in `tests/unit/lib/auth/passwordValidator.test.ts` — cases: valid password passes; fails when < 8 chars, missing uppercase, missing lowercase, missing digit; each rule tested independently with `it('should reject ... when ...')`
- [X] T023 [P] [US1] Write failing unit tests for `lockoutPolicy` in `tests/unit/lib/auth/lockoutPolicy.test.ts` — cases: `incrementFailures` increments counter, `isLocked` returns true after 5 failures, `getLockExpiry` returns `now + 900s`, `resetFailures` zeros counter, locked account shows generic error msg; uses `jest.useFakeTimers()`
- [X] T024 [P] [US1] Write failing unit tests for `sessionManager` in `tests/unit/lib/auth/sessionManager.test.ts` — cases: session valid within 8 h, expired session detected, `returnUrl` preserved on redirect, no `returnUrl` defaults to role home; uses `jest.useFakeTimers()`

### Integration Tests — User Story 1 *(write first — must FAIL before T031)*

- [X] T025 [P] [US1] Write failing integration tests for `register` Server Action in `tests/integration/auth/register.test.ts` — cases: valid input creates user row, duplicate email returns error without leaking existence, weak password rejected with rules error; uses `tests/helpers/authHelpers.ts`
- [X] T026 [P] [US1] Write failing integration tests for `login` Server Action + lockout in `tests/integration/auth/login.test.ts` — cases: correct creds reset counter + return session, wrong creds increment counter, 5th failure locks account, locked account message is generic, lock expires after 900 s (`jest.useFakeTimers`), successful login after lock resets counter
- [X] T027 [P] [US1] Write failing integration tests for middleware session guard in `tests/integration/auth/session.test.ts` — cases: unauthenticated request to `/(portal)` redirects to `/login?returnUrl=<path>`, expired session redirects, valid session passes through

### Implementation — User Story 1 *(make tests GREEN)*

- [X] T028 [P] [US1] Implement `src/lib/auth/passwordValidator.ts` — export `validatePassword(password: string): { valid: boolean; errors: string[] }` (GREEN for T022)
- [X] T029 [P] [US1] Implement `src/lib/auth/lockoutPolicy.ts` — export `isLocked(user)`, `incrementFailures(db, userId)`, `resetFailures(db, userId)`, `getLockExpiry(now)` (GREEN for T023)
- [X] T030 [P] [US1] Implement `src/lib/auth/sessionManager.ts` — export `isSessionExpired(session)`, `buildReturnUrl(path)`, `getRoleHome(role)` (GREEN for T024)
- [X] T031 [US1] Implement `register` and `login` Server Actions in `src/lib/actions/auth.ts` using `passwordValidator`, `lockoutPolicy`, bcryptjs, Drizzle insert/select (GREEN for T025, T026)
- [X] T032 [US1] Update `middleware.ts` with `returnUrl` logic using `sessionManager.buildReturnUrl`; wire into NextAuth session check (GREEN for T027)
- [X] T033 [P] [US1] Build `RegisterForm.tsx` in `src/components/auth/` — display name, email, password fields; inline per-field validation feedback; calls `register` action
- [X] T034 [P] [US1] Build `LoginForm.tsx` in `src/components/auth/` — email + password; generic error on failure; lockout message after 5 attempts; honours `returnUrl` query param
- [X] T035 [US1] Build `/register` page at `src/app/(auth)/register/page.tsx` using `RegisterForm`; redirect already-authenticated users to their role home
- [X] T036 [US1] Build `/login` page at `src/app/(auth)/login/page.tsx` using `LoginForm`; read `returnUrl` from search params; pass to `LoginForm`
- [X] T037 [US1] Build portal shell layout at `src/app/(portal)/layout.tsx` — `<nav>` with role-aware links (`My Ideas` for submitter, `Admin Dashboard` for admin) + `Logout` button calling `signOut`

**Checkpoint**: US1 fully functional and independently testable — register, login, logout, route guard, lockout all green

---

## Phase 4: User Story 2 — Submit an Idea (Priority: P1)

**Goal**: Authenticated submitter fills in idea form (title ≤ 100 chars, description ≤ 2 000 chars, category), optionally attaches one file (≤ 10 MB, allowed types), submits — idea appears in listing with status "Submitted".

**Independent Test**: Log in as submitter → click "Submit Idea" → fill all fields → attach a valid PDF → click Submit → verify idea appears in `/ideas` with status "Submitted" and attachment is retrievable.

### Unit Tests — User Story 2 *(write first — must FAIL before T042)*

- [X] T038 [P] [US2] Write failing unit tests for `ideaValidator` in `tests/unit/lib/ideas/ideaValidator.test.ts` — cases: valid input passes; title missing, title > 100 chars, description missing, description > 2 000 chars, invalid category slug each return specific errors; each case is an independent `it` block
- [X] T039 [P] [US2] Write failing unit tests for `attachmentValidator` in `tests/unit/lib/attachments/attachmentValidator.test.ts` — cases: valid PDF passes, each disallowed MIME type rejected, file exactly 10 MB passes, file 1 byte over 10 MB rejected, second attachment attempt (count = 1) rejected with 409-compatible error

### Integration Tests — User Story 2 *(write first — must FAIL before T044)*

- [X] T040 [P] [US2] Write failing integration tests for `submitIdea` Server Action in `tests/integration/ideas/submit.test.ts` — cases: valid submission creates row with status `submitted` and correct `submitter_id`, missing title rejected, title > 100 chars rejected server-side, description > 2 000 chars rejected, invalid category rejected; uses `tests/helpers/ideaHelpers.ts`
- [X] T041 [P] [US2] Write failing integration tests for `POST /api/attachments`, `GET /api/attachments/[id]`, `DELETE /api/attachments/[id]` in `tests/integration/attachments/upload.test.ts` — cases: valid upload returns 201 with correct shape, second upload returns 409, oversized file returns 400, disallowed MIME returns 400, unauthenticated returns 401, wrong owner returns 403, download returns correct bytes + Content-Disposition header, delete removes record

### Implementation — User Story 2 *(make tests GREEN)*

- [X] T042 [P] [US2] Implement `src/lib/ideas/ideaValidator.ts` — export `validateIdea(input): { valid: boolean; errors: Record<string, string> }` (GREEN for T038)
- [X] T043 [P] [US2] Implement `src/lib/attachments/attachmentValidator.ts` — export `validateAttachment(mimeType, sizeBytes, existingCount): ValidationResult` (GREEN for T039)
- [X] T044 [US2] Implement `submitIdea` Server Action in `src/lib/actions/ideas.ts` — validate via `ideaValidator`, generate `IDEA-####` ID from `numeric_id` autoincrement, insert row, call `revalidatePath('/ideas')` (GREEN for T040)
- [X] T045 [P] [US2] Build `FileUpload.tsx` in `src/components/ideas/` — single-file picker, show file name + size, remove button, client-side MIME + size validation with inline error messages; emits `onFileChange(file | null)`
- [X] T046 [US2] Build `IdeaForm.tsx` in `src/components/ideas/` — title field (live 100-char counter), description textarea (live 2 000-char counter), category `<select>`, `FileUpload` slot, Submit button with loading state
- [X] T047 [US2] Build `/ideas/new` page at `src/app/(portal)/ideas/new/page.tsx` — submitter-role only; renders `IdeaForm`; admin is redirected to `/admin`
- [X] T048 [US2] Implement `POST /api/attachments` Route Handler at `src/app/api/attachments/route.ts` — session check, ownership + status guard, `attachmentValidator`, UUID disk filename via `storage.ts`, insert `attachments` row (GREEN for T041 POST cases)
- [X] T049 [US2] Implement `GET /api/attachments/[id]` (stream file bytes) and `DELETE /api/attachments/[id]` (delete record + disk file) at `src/app/api/attachments/[id]/route.ts` — session + ownership guards per attachments-api.md (GREEN for T041 GET/DELETE cases)

**Checkpoint**: US2 fully functional — idea submission with optional single-file attachment independently testable

---

## Phase 5: User Story 3 — View Idea Listing (Priority: P1)

**Goal**: Authenticated submitter sees all their submitted ideas (title, category, date, status badge); empty state when none exist; status updates from admin evaluation reflected immediately.

**Independent Test**: Log in as submitter with ≥ 1 submitted idea → navigate to `/ideas` → each idea shows title, category, formatted date, correct status badge → submit another idea → it appears without reload.

### Integration Tests — User Story 3 *(write first — must FAIL before T051)*

- [X] T050 [P] [US3] Write failing integration tests for `getMyIdeas` and `getIdeaById` Server Actions in `tests/integration/ideas/list.test.ts` — cases: submitter receives only own ideas ordered by `submitted_at DESC`, admin receives all ideas, empty result returns `[]` not null, status updated by evaluation is reflected in next call; uses `tests/helpers/ideaHelpers.ts`

### Implementation — User Story 3 *(make tests GREEN)*

- [X] T051 [P] [US3] Implement `getMyIdeas`, `getIdeaById`, and `getAdminIdeas` Server Actions in `src/lib/actions/ideas.ts` — `getMyIdeas` filters by `submitter_id`, `getAdminIdeas` returns all ideas ordered by `submitted_at DESC`, ownership check in `getIdeaById` with admin bypass, join `attachments` for download link (GREEN for T050)
- [X] T052 [P] [US3] Build `IdeaCard.tsx` in `src/components/ideas/` — title, category, `format(submittedAt, 'dd MMM yyyy')` (`date-fns`), status `<Badge>` with semantic colour map (`submitted`=blue, `under_review`=amber, `accepted`=green, `rejected`=red)
- [X] T053 [P] [US3] Build `IdeaList.tsx` in `src/components/ideas/` — renders list of `IdeaCard` components; shows empty-state `<section>` with "Submit Your First Idea" `<Button>` link when array is empty
- [X] T054 [US3] Build `/ideas` page at `src/app/(portal)/ideas/page.tsx` — server component; calls `getMyIdeas`; renders `IdeaList` + "Submit Idea" link button in page header
- [X] T055 [US3] Build `/ideas/[id]` detail page at `src/app/(portal)/ideas/[id]/page.tsx` — calls `getIdeaById`; shows all idea fields; attachment download link (if present); admin comment + evaluator display name (if accepted/rejected)

**Checkpoint**: US3 fully functional — listing, empty state, status badges, and detail view independently testable

---

## Phase 6: User Story 4 — Evaluate an Idea as Admin (Priority: P1)

**Goal**: Admin sees all submitted/under-review ideas, opens one (auto-transitions to "Under Review"), reads details and attachment, enters a mandatory comment, accepts or rejects — submitter's listing reflects the new status immediately.

**Independent Test**: Log in as admin → `/admin` shows ideas → open submitted idea → status flips to "Under Review" → enter comment → click Accept → idea shows "Accepted" in `/admin` and in submitter's `/ideas`; repeat with Reject; verify empty comment is blocked.

### Unit Tests — User Story 4 *(write first — must FAIL before T058)*

- [X] T056 [P] [US4] Write failing unit tests for `statusMachine` in `tests/unit/lib/ideas/statusMachine.test.ts` — valid transitions: `submitted→under_review`, `under_review→accepted`, `under_review→rejected`; invalid transitions: `submitted→accepted`, `submitted→rejected`, `accepted→rejected`, `rejected→accepted` all throw; each case is an independent `it` block

### Integration Tests — User Story 4 *(write first — must FAIL before T059)*

- [X] T057 [P] [US4] Write failing integration tests for `transitionToUnderReview`, `acceptIdea`, `rejectIdea` Server Actions in `tests/integration/evaluation/evaluate.test.ts` — cases: `transitionToUnderReview` sets status + `evaluating_admin_id`, `acceptIdea` with valid comment sets status `accepted` + stores trimmed comment + timestamps, empty comment returns `'Comment is required'`, idea in wrong status returns `'Idea cannot be evaluated in its current status'`, non-admin returns `'Forbidden'`, `revalidatePath` called for `/admin` and `/ideas` on success; uses `tests/helpers/ideaHelpers.ts`

### Implementation — User Story 4 *(make tests GREEN)*

- [X] T058 [P] [US4] Implement `src/lib/ideas/statusMachine.ts` — export `transition(current: IdeaStatus, next: IdeaStatus): void` (throws on invalid); export `VALID_EVAL_STATUSES: IdeaStatus[]` (GREEN for T056)
- [X] T059 [US4] Implement `transitionToUnderReview`, `acceptIdea`, `rejectIdea` Server Actions in `src/lib/actions/evaluation.ts` — admin guard, `statusMachine.transition` call, Drizzle update with `evaluated_at`, `revalidatePath` for both `/admin` and `/ideas` per evaluation-api.md (GREEN for T057)
- [X] T060 [P] [US4] Build `AdminIdeaList.tsx` in `src/components/admin/` — displays all ideas; status filter tabs (`All` / `Submitted` / `Under Review` / `Accepted` / `Rejected`); each row links to `/admin/ideas/[id]`
- [X] T061 [P] [US4] Build `EvaluationForm.tsx` in `src/components/admin/` — comment `<textarea>` (required); Accept and Reject `<Button>`s with loading state; inline error on empty comment; inline error on concurrent-conflict (`'Idea cannot be evaluated in its current status'`)
- [X] T062 [US4] Build `/admin` page at `src/app/(portal)/admin/page.tsx` — admin-role guard (redirect non-admins to `/ideas`); server component; calls `getAdminIdeas` Server Action in `src/lib/actions/ideas.ts`; renders `AdminIdeaList`
- [X] T063 [US4] Build `/admin/ideas/[id]` page at `src/app/(portal)/admin/ideas/[id]/page.tsx` — calls `transitionToUnderReview` on load (no-op if already beyond `submitted`); renders full idea detail + attachment download link; renders `EvaluationForm` only when status is `submitted` or `under_review`

**Checkpoint**: US4 fully functional — full accept/reject cycle including conflict handling and revalidation independently testable

---

## Final Phase: Polish & Cross-Cutting Concerns

*E2E specs are written in this phase (AFTER unit and integration tests confirm server logic works), covering only the critical happy paths that cross the full stack.*

- [X] T064 [P] Write Playwright E2E spec for register → login → logout → protected redirect in `tests/e2e/auth/submitter-registers-and-logs-in.spec.ts` — asserts: unauthenticated visit redirects to login, registration lands on `/ideas`, logout redirects to `/login`, previously protected URL now blocked
- [X] T065 [P] Write Playwright E2E spec for account lockout in `tests/e2e/auth/account-lockout.spec.ts` — asserts: 5 consecutive wrong-password submissions trigger lockout message, correct credentials during lockout still rejected, message never reveals account existence; use Playwright clock to skip 15-min wait
- [X] T066 [P] Write Playwright E2E spec for submitter idea submission with attachment in `tests/e2e/ideas/submitter-submits-idea-with-attachment.spec.ts` — asserts: form validation messages shown on empty submit, valid submission with PDF appears in `/ideas` listing with status "Submitted", attachment download link is functional
- [X] T067 [P] Write Playwright E2E spec for admin evaluates idea in `tests/e2e/evaluation/admin-evaluates-idea.spec.ts` — asserts: admin opens submitted idea → status shows "Under Review", empty comment blocked, Accept with comment → "Accepted" in both `/admin` and submitter's `/ideas`, Reject with comment → "Rejected" with comment visible to submitter
- [X] T068 [P] Verify all 7 core pages (`/login`, `/register`, `/ideas`, `/ideas/new`, `/ideas/[id]`, `/admin`, `/admin/ideas/[id]`) render correctly at ≥ 320 px (mobile) and ≥ 1 280 px (desktop) — fix any overflow or layout breaks
- [X] T069 [P] Verify WCAG 2.1 AA contrast ratios and visible keyboard focus indicators on all interactive elements (`<button>`, `<input>`, `<textarea>`, `<select>`, `<a>`) across all 7 pages
- [X] T070 Smoke-test page load performance: each of the 7 core pages MUST be fully interactive within 2 s on a simulated ≥ 10 Mbps connection (Lighthouse CLI or DevTools Network throttle)

---

## Dependency Graph

```
Phase 1 (T001–T010)  ← test tooling: jest.config.ts, playwright.config.ts,
    |                    stryker.config.ts, Husky, 8 npm scripts
    ↓
Phase 2 (T011–T021)  ← data layer + test fixtures/helpers
    |                    ALL stories blocked until here
    ↓
Phase 3 US1 (T022–T037)  ← unit tests (T022-T024) → integration tests (T025-T027) → impl (T028+)
    |                        ALL other stories blocked until here (auth required everywhere)
    ├──→ Phase 4 US2 (T038–T049)  ┐
    ├──→ Phase 5 US3 (T050–T055)  ├── can run in parallel after US1 complete
    └──→ Phase 6 US4 (T056–T063)  ┘   (US4 best started after US2 for realistic test data)
             ↓
         Final Phase (T064–T070)  ← after all user stories complete
```

### Parallel Execution Within Each Phase

**Phase 1** — T002–T010 all parallel after T001 (project scaffold)

**Phase 2** — T012–T021 all parallel after T011 (schema must exist first); T013 after T012

**Phase 3** within TDD order:
- Unit tests T022, T023, T024 parallel (write all failing)
- Integration tests T025, T026, T027 parallel (write all failing)
- Impl: T028, T029, T030 parallel → T031 after T028/T029/T030 → T032 after T031
- Components: T033, T034 parallel → T035, T036, T037 parallel after their respective forms

**Phase 4** within TDD order:
- Unit tests T038, T039 parallel; integration tests T040, T041 parallel
- Impl: T042, T043 parallel → T044 after T042; T045 parallel with T044 → T046 after T045; T047, T048, T049 after T044/T048

**Phase 5** within TDD order:
- T050 (integration test) → T051 (impl, GREEN); then T052, T053 parallel → T054, T055 parallel

**Phase 6** within TDD order:
- T056 (unit test) + T057 (integration test) parallel → T058 after T056; T059 after T057/T058
- T060, T061 parallel (components, no impl dependency) → T062, T063 parallel after T059

**Final Phase** — T064–T069 all parallel; T070 last (needs pages complete)

---

## Implementation Strategy

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (US1) + Phase 4 (US2) + Phase 5 (US3) in strict order.
This delivers: register → login → submit idea → see it in listing — a fully demonstrable, independently testable vertical slice.
Phase 6 (US4 admin evaluation) closes the loop for the complete Phase 1 product.

**Test count summary** (per constitution Principle V — 70% unit / 20% integration / 10% E2E target):

| Layer | Files | Location |
|---|---|---|
| Unit | 6 files (passwordValidator, lockoutPolicy, sessionManager, ideaValidator, attachmentValidator, statusMachine) | `tests/unit/lib/` |
| Integration | 7 files (register, login, session, submit, upload, list, evaluate) | `tests/integration/` |
| E2E | 4 specs (register+login, lockout, submit-idea, admin-evaluate) | `tests/e2e/` |
| Fixtures | 3 files (users, ideas, attachments) | `tests/fixtures/` |
| Helpers | 3 files (auth, idea, attachment) | `tests/helpers/` |

**Quality gates required before Final Phase**:
- `npm run test:coverage` — ≥ 80% line, ≥ 75% branch
- `npm run typecheck` — zero errors
- `npm run lint` — zero warnings
- `npm run test:mutation` — ≥ 75% Stryker score
