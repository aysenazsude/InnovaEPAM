# Implementation Plan: Multi-Media Attachments — Phase 3

**Branch**: `003-multimedia-attachments` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-multimedia-attachments/spec.md`

## Summary

Extend the Phase 1 single-file attachment system to support up to 3 files per idea submission, with inline previews (image thumbnail, video player widget, document icon) rendered client-side before submission. Server-side type verification uses magic-byte detection. All files and the idea record are inserted atomically within a single `better-sqlite3` transaction. An authorized download endpoint (`GET /api/attachments/[id]`) restricts access to the submitter and admins. The admin idea detail view lists all attachments with previews and per-file download controls. The implementation is purely additive: Phase 1 DB rows are forward-compatible via a `NOT NULL DEFAULT 0` column migration.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode); Node.js 20 LTS — unchanged from Phase 1/2  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Drizzle ORM + `better-sqlite3`, shadcn/ui — no new runtime packages required  
**Storage**: SQLite (WAL mode) via `better-sqlite3`; `attachments` table extended with `upload_order_index` via Drizzle migration `0002_add_attachment_order_index.sql`; files stored on disk at `UPLOAD_DIR`  
**Testing**: Jest + React Testing Library (unit/component), Playwright (E2E), Stryker (mutation) — unchanged toolchain  
**Target Platform**: Node.js server — unchanged from Phase 1/2 (no edge runtime)  
**Project Type**: Web application — incremental feature addition to existing Next.js App Router portal  
**Performance Goals**: Image thumbnail renders ≤ 500 ms on file selection (client-side `createObjectURL`); video player mounts ≤ 500 ms; form submission with 3 × 10 MB files completes ≤ 5 s on ≥ 10 Mbps broadband  
**Constraints**: No new runtime npm packages; `better-sqlite3` Node-only; magic-byte MIME detection implemented as bespoke 30-line utility; `createObjectURL` used for all previews (no `FileReader.readAsDataURL` due to memory cost)  
**Scale/Scope**: Same as Phase 1/2 — internal team scale (~500 concurrent users); 1 column migration; 2 new pure-function modules; 1 new API route; extensions to 6 existing files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Clean Code** — `mimeDetector.ts` and `mimeToIcon.ts` are single-responsibility pure functions; `validateAttachments` is a named standalone function separate from the legacy `validateAttachment`; `FileUpload` component extended to stay under 300 lines; all helpers separated into their own modules; ESLint + Prettier zero-warning gate unchanged.
- [x] **II. Simple & Responsive UI/UX** — Attachment list layout verified at ≥ 320px (vertical stack), ≥ 768px (grid), ≥ 1280px (grid); `<video controls preload="none">` is keyboard-accessible per WCAG 2.1 AA; `<img alt={fileName}>` for thumbnails; `aria-live="polite"` on attachment list container; `role="alert"` on per-file error messages; `prefers-reduced-motion` respected (no CSS animations on core content); indeterminate progress bar uses `role="progressbar" aria-busy="true"`.
- [x] **III. Minimal Dependencies** — No new runtime packages. Magic-byte detection implemented in-project; `createObjectURL` is a browser native API; `<video>` is a native HTML element. All existing pinned exact versions unchanged.
- [x] **IV. Testing Philosophy** — TDD RED-GREEN-REFACTOR mandated; unit tests for `mimeDetector`, `mimeToIcon`, updated `attachmentValidator`, and `FileUpload` written before implementation; integration tests for multi-file submission and download endpoint written before server-action changes; all test expectations derived from spec acceptance scenarios.
- [x] **V. Coverage Requirements** — Two new pure-function modules (`mimeDetector`, `mimeToIcon`) will reach 100% line/branch coverage trivially; updated `attachmentValidator` branches fully covered by new multi-file tests; overall coverage must remain ≥ 80% line / ≥ 75% branch; Stryker mutation score ≥ 75%.
- [x] **VI. Test Types & Organization** — New unit tests at `tests/unit/lib/attachments/mimeDetector.test.ts`, `mimeToIcon.test.ts`; extended `tests/unit/lib/attachments/attachmentValidator.test.ts`; extended `tests/unit/components/ideas/FileUpload.test.tsx`; extended integration tests in `tests/integration/attachments/upload.test.ts` and `tests/integration/ideas/list.test.ts`; new E2E specs at `tests/e2e/ideas/submitter-attaches-multiple-files.spec.ts` and `attachment-validation.spec.ts`.
- [x] **VII. Naming Conventions** — `mimeDetector.test.ts`, `mimeToIcon.test.ts`; E2E specs `submitter-attaches-multiple-files.spec.ts` and `attachment-validation.spec.ts`; `describe('mimeDetector')` + `it('should X when Y')` pattern throughout.
- [x] **VIII. Test Anatomy** — AAA pattern; `beforeEach` for setup; each `it` independently runnable; no shared mutable state; `clearMocks: true` in `jest.config.ts` applies globally; `URL.createObjectURL` mocked in jsdom unit tests via `jest.fn()`.
- [x] **IX. Mocking & Test Data** — Multi-file DB operations tested against real in-memory SQLite test DB; `mimeDetector` and `mimeToIcon` tested directly (pure functions — no mocking needed); `tests/fixtures/attachments.ts` extended with `createAttachment(type?, sizeBytes?, orderIndex?)` and magic-byte buffer factories per type; `URL.createObjectURL` and `URL.revokeObjectURL` mocked in jsdom environment for `FileUpload` component tests.
- [x] **X. Quality Criteria** — No tautological assertions; each `it` covers one behaviour; pure-function unit tests < 1 s; integration tests < 5 s; mutation score ≥ 75%; anti-pattern checklist in PR template.
- [x] **XI. Tools & Frameworks** — All 8 `npm run` scripts unchanged; Husky pre-commit unchanged; CI Steps 1–6 required on every PR; `npm run db:generate && npm run db:migrate` documented in quickstart for the new migration.

## Project Structure

### Documentation (this feature)

```text
specs/003-multimedia-attachments/
├── plan.md                          # This file
├── spec.md                          # Feature specification
├── research.md                      # Phase 0 — design decisions (R1–R8)
├── data-model.md                    # Phase 1 — schema extension + module shapes
├── quickstart.md                    # Phase 1 — developer setup guide
├── contracts/
│   └── multimedia-attachments-api.md  # Download endpoint + extended action contracts
└── tasks.md                         # Generated by /speckit.tasks
```

### Source Code Changes (repository root)

```text
src/
├── lib/
│   ├── constants.ts                 # EXTENDED — add video MIME types, MAX_ATTACHMENTS_PER_IDEA, MAX_TOTAL_ATTACHMENT_SIZE
│   ├── storage.ts                   # EXTENDED — add video MIME→extension mappings
│   ├── db/
│   │   ├── schema.ts                # EXTENDED — add uploadOrderIndex column to attachments table
│   │   └── migrations/
│   │       └── 0002_add_attachment_order_index.sql  # NEW — generated by drizzle-kit
│   └── attachments/
│       ├── attachmentValidator.ts   # EXTENDED — add validateAttachments() multi-file function
│       ├── mimeDetector.ts          # NEW — magic-byte MIME detection utility
│       └── mimeToIcon.ts            # NEW — maps MIME type to PreviewKind enum
├── app/
│   └── api/
│       └── attachments/
│           ├── route.ts             # UNCHANGED (Phase 1 single-file upload — kept for backward compat)
│           └── [id]/
│               └── route.ts         # NEW — GET download endpoint with submitter+admin auth
├── components/
│   └── ideas/
│       ├── FileUpload.tsx           # EXTENDED — multi-file staged list with preview per type
│       └── IdeaForm.tsx             # EXTENDED — wire multi-file FileUpload; progress bar via pending
└── lib/
    └── actions/
        └── ideas.ts                 # EXTENDED — submitIdea reads getAll('file'), validateAttachments,
                                     #             db.transaction wrapping all inserts + disk writes;
                                     #             getMyIdeas/getAdminIdeas/getIdeaById return attachments[]

tests/
├── unit/
│   └── lib/
│       └── attachments/
│           ├── mimeDetector.test.ts           # NEW
│           ├── mimeToIcon.test.ts             # NEW
│           └── attachmentValidator.test.ts    # EXTENDED — multi-file cases
│   └── components/
│       └── ideas/
│           └── FileUpload.test.tsx            # EXTENDED — multi-file, preview per type, progress
├── integration/
│   └── attachments/
│       └── upload.test.ts                     # EXTENDED — multi-file persistence, rollback, download auth
│   └── ideas/
│       └── list.test.ts                       # EXTENDED — attachments[] shape on detail
├── e2e/
│   └── ideas/
│       ├── submitter-attaches-multiple-files.spec.ts  # NEW
│       └── attachment-validation.spec.ts              # NEW
└── fixtures/
    └── attachments.ts                                 # EXTENDED — orderIndex param, buffer factories
```

**Structure Decision**: All changes are additive within the existing single-project Next.js layout. No new top-level directories. New pure-function modules placed in `src/lib/attachments/` alongside the existing `attachmentValidator.ts`. New API route placed under `src/app/api/attachments/[id]/` following Next.js App Router dynamic route convention.

## Complexity Tracking

> No Constitution Check violations. No complexity justification required.

