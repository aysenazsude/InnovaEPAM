# Implementation Log: InnovatEPAM Portal — Phase 1 MVP

**Branch**: `001-innovatepam-portal` | **Completed**: 2026-05-13  
**Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

---

## Phase 1 Delivery Summary

All 70 tasks completed. 133 tests passing (16 suites). TypeScript strict — zero errors. Coverage: **96.93% statements / 82.03% branches** (thresholds: 80% lines / 75% branches).

---

## Implemented Files

### Auth & Session
| File | Purpose |
|------|---------|
| `src/auth.config.ts` | **Edge-safe** NextAuth config (callbacks, session strategy, pages). No Node.js imports. Used by middleware. |
| `src/auth.ts` | Full NextAuth config — spreads `auth.config.ts`, adds Credentials provider with bcrypt + DB. Node.js only. |
| `src/types/next-auth.d.ts` | Augments NextAuth `User`, `Session`, and `JWT` interfaces to include `id` and `role`. |
| `middleware.ts` | Edge-compatible auth guard. Imports `NextAuth(authConfig)` — never imports `src/auth.ts`. Protects `/ideas/*` and `/admin/*`. |
| `src/lib/auth/passwordValidator.ts` | Pure fn: min 8 chars, uppercase, lowercase, digit. |
| `src/lib/auth/lockoutPolicy.ts` | `isLocked`, `incrementFailures`, `resetFailures` — 5 attempts / 15-min window. |
| `src/lib/auth/sessionManager.ts` | `isSessionExpired`, `buildReturnUrl`, `getRoleHome`. |
| `src/lib/actions/auth.ts` | `register` (bcrypt-12, duplicate email check) and `logout` server actions. |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all handler — exports `GET` and `POST` from `handlers`. |

### Database
| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Drizzle schema: `users`, `ideas`, `attachments`, `idea_categories`. UUID PKs, FK refs, indexes. |
| `src/lib/db/index.ts` | SQLite singleton (WAL mode). Uses template literal for `dbPath` — no `path` module (Edge-safe import chain). |
| `src/lib/db/migrations/0000_shallow_richard_fisk.sql` | Generated migration + 5 seed rows for `idea_categories`. |
| `drizzle.config.ts` | Points drizzle-kit at `src/lib/db/schema.ts`. |

### Ideas
| File | Purpose |
|------|---------|
| `src/lib/ideas/ideaValidator.ts` | Validates title (≤100), description (≤2000), category (must be a known slug). |
| `src/lib/ideas/statusMachine.ts` | `transition(current, next)` — throws on invalid transition. Valid: `submitted→under_review→accepted/rejected`. |
| `src/lib/actions/ideas.ts` | `submitIdea` (+ optional file upload in one step), `getMyIdeas`, `getAdminIdeas`, `getIdeaById`. |

### Attachments
| File | Purpose |
|------|---------|
| `src/lib/attachments/attachmentValidator.ts` | MIME type allowlist (5 types), 10 MB limit, one-per-idea (409). |
| `src/lib/storage.ts` | `saveFile(buffer, mimeType, uploadDir)` and `deleteFile`. Uses `crypto.randomUUID()` — no `uuid` package. |
| `src/app/api/attachments/route.ts` | `POST /api/attachments` — multipart upload, ownership + status guard. |
| `src/app/api/attachments/[id]/route.ts` | `GET` (download) and `DELETE` — admin bypass on GET, submitter-only DELETE. |

### Evaluation
| File | Purpose |
|------|---------|
| `src/lib/actions/evaluation.ts` | `transitionToUnderReview` (auto on admin page load), `acceptIdea`, `rejectIdea` — admin guard, `statusMachine.transition`, `revalidatePath`. |

### UI — Auth
| File | Purpose |
|------|---------|
| `src/components/auth/RegisterForm.tsx` | Client form: displayName, email, password; inline field errors; redirects to `/login?registered=true`. |
| `src/components/auth/LoginForm.tsx` | Client form: email, password; `signIn('credentials')`; respects `returnUrl` param. |
| `src/app/(auth)/register/page.tsx` | Server component; redirects logged-in users. |
| `src/app/(auth)/login/page.tsx` | Server component; wrapped in `<Suspense>` for `useSearchParams`. |

### UI — Ideas
| File | Purpose |
|------|---------|
| `src/components/ideas/IdeaForm.tsx` | `useActionState` form with title, description, category, optional file input. |
| `src/components/ideas/FileUpload.tsx` | Client uploader; `router.refresh()` after success; inline MIME/size validation. |
| `src/components/ideas/IdeaCard.tsx` | Title, category, `date-fns` formatted date, semantic status badge. |
| `src/components/ideas/IdeaList.tsx` | Renders `IdeaCard` list or empty-state with "Submit Your First Idea" CTA. |
| `src/app/(portal)/ideas/page.tsx` | Server component; calls `getMyIdeas`; renders `IdeaList` + header button. |
| `src/app/(portal)/ideas/new/page.tsx` | Renders `IdeaForm` in a Card. |
| `src/app/(portal)/ideas/[id]/page.tsx` | Idea detail: description, attachment download or `FileUpload` widget (status `submitted` only), admin feedback. |

### UI — Admin
| File | Purpose |
|------|---------|
| `src/components/admin/AdminIdeaList.tsx` | Client component with status filter tabs; links each row to `/admin/ideas/[id]`. |
| `src/components/admin/EvaluationForm.tsx` | Comment textarea + Accept / Reject buttons; inline error for empty comment or status conflict. |
| `src/app/(portal)/admin/page.tsx` | Server component; admin-role guard; calls `getAdminIdeas`; renders `AdminIdeaList`. |
| `src/app/(portal)/admin/ideas/[id]/page.tsx` | Auto-calls `transitionToUnderReview`; renders detail + `EvaluationForm` for evaluable statuses. |

### Portal Shell
| File | Purpose |
|------|---------|
| `src/app/(portal)/layout.tsx` | Auth guard, role-aware nav (My Ideas / Admin Dashboard), Logout form. |
| `src/app/page.tsx` | Root redirect → `/login`. |
| `src/app/layout.tsx` | Root layout: Geist fonts, `globals.css`. |
| `src/styles/globals.css` | Tailwind v4 `@theme` — EPAM brand tokens, shadcn semantic aliases, `prefers-reduced-motion`. |

### Config & Tooling
| File | Purpose |
|------|---------|
| `.env.local` | `NEXTAUTH_SECRET`, `DATABASE_URL`, `UPLOAD_DIR` for local dev. |
| `.env.example` | Template committed to repo. |
| `jest.config.ts` | `projects` array: unit (jsdom) + integration (node); `setupFilesAfterEnv`; `moduleNameMapper`. |
| `playwright.config.ts` | Chromium always; Firefox + WebKit CI-only; `testDir: tests/e2e`. |
| `stryker.config.ts` | Mutates `src/lib/**/*.ts`; thresholds high 80 / low 75 / break 70. |
| `src/lib/constants.ts` | `ALLOWED_MIME_TYPES`, `FILE_SIZE_LIMIT`, `CATEGORIES`, `PASSWORD_MIN_LENGTH`, `SESSION_MAX_AGE_SECONDS`, `LOCKOUT_*`. |

---

## Key Technical Decisions & Fixes

### Edge Runtime Compatibility (post-implementation fix)
**Problem**: `middleware.ts` imported `auth` from `src/auth.ts`, which transitively imported `better-sqlite3`, `bcryptjs`, and the `path` module — all Node.js-only. Next.js middleware runs in the Edge Runtime, causing a build error.

**Solution** — three-part split:

1. **`src/auth.config.ts`** — new file containing only Edge-safe NextAuth config (JWT/session callbacks, pages, strategy). No imports of DB, bcrypt, or Node.js built-ins.
2. **`src/auth.ts`** — now spreads `authConfig` and adds the Credentials provider with `authorize` (DB + bcrypt). Stays Node.js-only; never imported by middleware.
3. **`middleware.ts`** — changed from `import { auth } from '@/auth'` to `import authConfig from '@/auth.config'` + `const { auth } = NextAuth(authConfig)`.

**`src/lib/db/index.ts`** — replaced `path.join(process.cwd(), ...)` with a template literal `` `${process.cwd()}/data/innovatepam.db` `` to eliminate the `path` module from the import graph.

### NextAuth Route Handler (post-implementation fix)
**Problem**: Login returned 404 because no handler existed for `/api/auth/*`.  
**Fix**: Created `src/app/api/auth/[...nextauth]/route.ts` exporting `{ GET, POST }` from `handlers`.

### Missing NEXTAUTH_SECRET (post-implementation fix)
**Problem**: `MissingSecret` error on first dev server start.  
**Fix**: Created `.env.local` with a generated 32-byte base64 secret; added explicit `secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET` to `src/auth.ts` as a belt-and-suspenders fallback.

### Attachment Upload on Submission Form
**Problem**: `FileUpload` component was only shown post-submission on the detail page, invisible to users with non-`submitted` status ideas.  
**Fix**: Added a file input directly to `IdeaForm.tsx`; `submitIdea` server action now reads the optional `file` field from `formData`, validates it, saves to disk, and inserts the attachment row atomically with the idea — single round-trip.

### uuid ESM-only Module
**Problem**: `uuid@14` is ESM-only and breaks Jest's CommonJS transform.  
**Fix**: Replaced all `import { v4 as uuidv4 } from 'uuid'` with `crypto.randomUUID()` (Node.js built-in, available in all environments).

### NextAuth Type Augmentation
`src/types/next-auth.d.ts` augments `User`, `Session.user`, and `JWT` to include `id: string` and `role: string`, eliminating unsafe `as unknown` casts in callbacks.

---

## Test Coverage (Phase 1 Final)

| Metric | Result | Threshold |
|--------|--------|-----------|
| Statements | 96.93% | 80% |
| Branches | 82.03% | 75% |
| Functions | 96.96% | — |
| Lines | 97.11% | 80% |
| Test suites | 16 passed | — |
| Tests | 133 passed | — |

**Suites**: `passwordValidator`, `lockoutPolicy`, `sessionManager`, `storage`, `ideaValidator`, `statusMachine`, `attachmentValidator` (unit) + `register`, `login`, `session`, `submit`, `list`, `evaluate`, `upload` (integration) + `submitter-registers-and-logs-in`, `account-lockout` (E2E spec files written, require running dev server).
