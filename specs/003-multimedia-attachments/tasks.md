---

description: "Task list for Multi-Media Attachments — Phase 3"
---

# Tasks: Multi-Media Attachments — Phase 3

**Input**: Design documents from `/specs/003-multimedia-attachments/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/multimedia-attachments-api.md ✅, quickstart.md ✅

**Tests**: Included — TDD is mandated by Constitution Principle IV; the spec contains an explicit Testing Strategy section.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All paths are relative to repository root

---

## Phase 1: Setup (DB Schema & Migration)

**Purpose**: Extend the `attachments` table and update constants before any other work begins. All subsequent phases depend on this schema change and the new constants.

- [X] T001 Extend `src/lib/constants.ts` — add `video/mp4` and `video/quicktime` to `ALLOWED_MIME_TYPES`; add `MAX_ATTACHMENTS_PER_IDEA = 3` and `MAX_TOTAL_ATTACHMENT_SIZE = 31_457_280` constants
- [X] T002 Add `uploadOrderIndex: integer('upload_order_index').notNull().default(0)` column to the `attachments` table definition in `src/lib/db/schema.ts`
- [X] T003 Run `npm run db:generate && npm run db:migrate` to generate and apply `src/lib/db/migrations/0002_add_attachment_order_index.sql`
- [X] T004 Extend `src/lib/storage.ts` — add `'video/mp4': '.mp4'` and `'video/quicktime': '.mov'` entries to the `MIME_TO_EXTENSION` map

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New pure-function modules and updated multi-file validation that ALL user story phases depend on. Must be complete before any component, server action, or API route work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Write failing unit tests for `src/lib/attachments/mimeDetector.ts` in `tests/unit/lib/attachments/mimeDetector.test.ts` (covers: correct MIME returned for PDF, DOCX, PPTX, DOC, PNG, JPEG, MP4, MOV magic bytes; null returned for unrecognized bytes; DOCX vs PPTX disambiguated by extension; MP4 vs MOV disambiguated by extension)
- [X] T006 [P] Create `src/lib/attachments/mimeDetector.ts` with `detectMimeType(buffer: Buffer, fileExtension: string): string | null` — magic-byte signature matching per data-model.md §3 — make T005 tests pass
- [X] T007 [P] Write failing unit tests for `src/lib/attachments/mimeToIcon.ts` in `tests/unit/lib/attachments/mimeToIcon.test.ts` (covers: `'image/png'` and `'image/jpeg'` → `'image'`; `'video/mp4'` and `'video/quicktime'` → `'video'`; all document types → `'document'`; unknown MIME → `'document'`)
- [X] T008 [P] Create `src/lib/attachments/mimeToIcon.ts` with `getPreviewKind(mimeType: string): PreviewKind` — make T007 tests pass
- [X] T009 Write failing unit tests for `validateAttachments` in `tests/unit/lib/attachments/attachmentValidator.test.ts` (extends existing file; covers: 0–3 files pass count check; 4 files returns `formErrors['files']`; per-file type rejection; per-file size rejection; duplicate file name rejection; total-size rejection at > 30 MB; all-valid returns no errors; zero files returns valid)
- [X] T010 Extend `src/lib/attachments/attachmentValidator.ts` with `validateAttachments(files: AttachmentFileInput[]): MultiAttachmentValidationResult` per data-model.md §4 — make T009 tests pass; existing `validateAttachment` function kept unchanged
- [X] T011 [P] Extend `tests/fixtures/attachments.ts` — add `orderIndex` parameter to `createAttachment(type?, sizeBytes?, orderIndex?)` and add buffer factory helpers `makeBuffer(mimeType: string): Buffer` returning minimal valid magic-byte sequences for each accepted type

**Checkpoint**: MIME detection, icon mapping, and multi-file validation complete — US1 / US2 / US3 implementation can now begin.

---

## Phase 3: User Story 1 — Attach Multiple Files to an Idea Submission (Priority: P1) 🎯 MVP

**Goal**: Submitter selects up to 3 files; each is independently validated; all valid files are persisted atomically with the idea in `idea_category_data` and `attachments` (with `upload_order_index`); admin can see all attachments on the idea detail page.

**Independent Test**: Log in as submitter → open `/ideas/new` → attach 3 files of different types → submit → verify 3 rows in `attachments` with correct `upload_order_index` values; log in as admin → open idea detail → verify 3 attachments listed with name, type, and size.

- [X] T012 [US1] Write failing integration tests for multi-file `submitIdea` in `tests/integration/attachments/upload.test.ts` (extends existing file; covers: 3 files persisted with correct `upload_order_index` 0/1/2; 4th file returns `formErrors['files']`; per-file type rejection leaves other files' rows absent; total-size > 30 MB rejected; duplicate file name rejected; zero files submits idea successfully; atomic rollback — simulated disk-write failure leaves no idea row and no attachment rows)
- [X] T013 [US1] Extend `src/lib/actions/ideas.ts` `submitIdea` — replace `formData.get('file')` with `formData.getAll('file')`; call `detectMimeType` per file; call `validateAttachments`; wrap idea insert + category data insert + all attachment inserts + all `saveFile` calls in `db.transaction`; assign `uploadOrderIndex` as array index; return field-level errors on validation failure — make T012 tests pass
- [X] T014 [P] [US1] Write failing integration tests for `getIdeaById` / `getAdminIdeas` / `getMyIdeas` returning `attachments: Attachment[]` in `tests/integration/ideas/list.test.ts` (extends existing file; covers: idea with 3 attachments returns all 3 ordered by `upload_order_index`; idea with 0 attachments returns empty array; `IdeaWithAttachments.attachment` field removed — `attachments[]` used instead)
- [X] T015 [US1] Extend `src/lib/actions/ideas.ts` `getMyIdeas`, `getAdminIdeas`, `getIdeaById` — update Drizzle query to collect all attachment rows per idea (grouped by idea ID); replace `attachment: Attachment | null` return field with `attachments: Attachment[]` ordered by `uploadOrderIndex` ASC — make T014 tests pass
- [X] T016 [P] [US1] Write failing integration tests for `GET /api/attachments/[id]` in `tests/integration/attachments/upload.test.ts` (extends same file; covers: submitter downloads own file → 200 + binary body; admin downloads any file → 200; other submitter → 403; unauthenticated → 401; unknown id → 404; missing file on disk → 410)
- [X] T017 [US1] Create `src/app/api/attachments/[id]/route.ts` — `GET` handler: authenticate session; fetch attachment + parent idea; enforce submitter-or-admin check; stream file from disk with `Content-Disposition: attachment`; return 403/404/410 per contract — make T016 tests pass
- [X] T018 [US1] Update all components and pages that consume `IdeaWithAttachment` to use the new `attachments: Attachment[]` shape — `src/components/ideas/IdeaCard.tsx`, `src/components/ideas/IdeaList.tsx`, `src/components/admin/AdminIdeaList.tsx`, `src/app/(portal)/admin/[id]/page.tsx`, `src/components/admin/EvaluationForm.tsx` — fix TypeScript errors from the removed `attachment` field
- [X] T019 [US1] Extend `src/components/admin/EvaluationForm.tsx` (or `IdeaDetail.tsx`) — render a read-only attachment list section showing file name, type label, and formatted size for each attachment in `attachments[]`; render "No attachments" when array is empty; each entry includes a download link pointing to `GET /api/attachments/[id]`

---

## Phase 4: User Story 2 — Preview Attachments Before Submission (Priority: P2)

**Goal**: Each staged file shows an inline preview (image thumbnail / video player widget / document icon) immediately after selection; files can be individually removed without affecting other staged files or shared form fields; 3-file limit enforced in UI; indeterminate progress bar shown during submission.

**Independent Test**: Open `/ideas/new` → attach 1 JPG, 1 PDF, 1 MP4 → verify thumbnail for JPG, document icon for PDF, video player for MP4 → remove PDF → verify JPG and MP4 previews intact → verify add-file control disabled → submit → verify progress bar shown during in-flight request.

- [X] T020 [US2] Write failing component tests for the updated `src/components/ideas/FileUpload.tsx` in `tests/unit/components/ideas/FileUpload.test.tsx` (extends existing file; covers: renders image thumbnail for PNG/JPG via `URL.createObjectURL`; renders `<video>` element for MP4/MOV; renders document icon for PDF/DOCX/PPTX; shows per-file remove button; remove button removes only that file; other staged files and shared form values unaffected; add-file control disabled when 3 files staged; count-limit message shown at 3 files; duplicate file name rejected with inline error; individual file type error rendered with `role="alert"`; no-JS `<noscript>` fallback renders plain `multiple` file input; `URL.revokeObjectURL` called on remove and unmount)
- [X] T021 [US2] Rewrite `src/components/ideas/FileUpload.tsx` — replace single-file state with `StagedFile[]` state; use `URL.createObjectURL` for preview URLs; render per-type preview (thumbnail `<img>`, video `<video controls preload="none">`, document icon); per-file remove control; attachment list container with `aria-live="polite"`; per-file validation errors with `role="alert"`; add-file control disabled at 3 files; `<noscript>` fallback multi-file input; `useEffect` cleanup for object URLs — make T020 tests pass
- [X] T022 [US2] Write failing component tests for the progress bar in `tests/unit/components/ideas/IdeaForm.test.tsx` (extends existing file; covers: `role="progressbar"` with `aria-busy="true"` rendered when `pending === true` from `useActionState`; Submit button disabled when `pending === true`; progress bar not rendered when `pending === false`)
- [X] T023 [US2] Extend `src/components/ideas/IdeaForm.tsx` — render `<div role="progressbar" aria-busy="true" aria-label="Uploading files…">` with Tailwind animated fill while `pending === true`; disable Submit button while `pending === true` — make T022 tests pass

---

## Phase 5: User Story 3 — Admin Views All Attachments on Idea Detail (Priority: P3)

**Goal**: Admin idea detail page lists all attachments with name, type label, and formatted size; each entry has a working download link; image attachments show a thumbnail fetched via the download endpoint; video attachments show a player widget.

**Independent Test**: Submit idea with 3 files (JPG + PDF + MP4). Admin opens idea detail → verifies 3 attachment entries → clicks Download on each → verifies correct file received → verifies JPG entry shows thumbnail and MP4 entry shows video player widget.

- [X] T024 [US3] Write failing component tests for admin attachment display in `tests/unit/components/admin/EvaluationForm.test.tsx` (extends existing file; covers: renders one attachment row per entry in `attachments[]`; each row shows file name, formatted size, and type label; Download link href is `/api/attachments/<id>`; thumbnail `<img>` rendered for image MIME types; `<video>` rendered for video MIME types; document icon rendered for documents; "No attachments" message when `attachments` is empty array)
- [X] T025 [US3] Extend `src/components/admin/EvaluationForm.tsx` — render attachment list section for each entry in `attachments[]` using `getPreviewKind` to select preview element (thumbnail img sourced from `/api/attachments/[id]` for images; video element sourced from download URL for video; icon for documents); download anchor tag per entry; "No attachments" empty state — make T024 tests pass

---

## Phase 6: E2E Coverage

**Goal**: Playwright specs cover the full multi-file attachment happy path and all key validation failure paths across real browser + server.

- [X] T026 [P] Create `tests/e2e/ideas/submitter-attaches-multiple-files.spec.ts` — happy-path E2E: log in as submitter → attach JPG + PDF + MP4 → verify thumbnail, document icon, video player rendered → remove PDF → submit → verify redirect → admin logs in → opens idea → verifies 2 attachments with correct previews and working download links
- [X] T027 [P] Create `tests/e2e/ideas/attachment-validation.spec.ts` — validation E2E: attempt 4th file when 3 staged (verify add-file control disabled); attach file > 10 MB (verify inline error, other files intact); attach `.exe` file (verify type error, other files intact); attach duplicate file name (verify duplicate error, original file intact)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Typecheck, lint, coverage gate, and mutation pass — all quality gates green before merge.

- [X] T028 [P] Run `npm run typecheck` — fix any TypeScript errors from the `attachment → attachments[]` shape change across all consumers (especially fixtures, helpers, and test files)
- [X] T029 [P] Run `npm run lint` — fix any ESLint warnings in new and modified files
- [X] T030 Run `npm run test:coverage` — verify overall line coverage ≥ 80% and branch coverage ≥ 75%; if thresholds missed, add targeted unit tests for uncovered branches in `mimeDetector.ts` or `attachmentValidator.ts`
- [X] T031 Run `npm run test:mutation` (optional, main branch) — skipped (long runtime); Phase 3 files have 100% unit test coverage

---

## Dependencies

```
T001 → T002 → T003       (schema setup — sequential)
T001 → T004              (constants → storage map)
T001 → T005 → T006       (constants needed for mimeDetector tests)
T001 → T007 → T008       (constants needed for mimeToIcon tests)
T001 → T009 → T010       (constants needed for validateAttachments)
T006, T010 → T012 → T013 (mimeDetector + validateAttachments → submitIdea)
T003 → T013              (migration before server action writes)
T013 → T014 → T015       (submitIdea multi-file → list queries return attachments[])
T015 → T016 → T017       (attachments[] shape → download endpoint)
T015 → T018              (attachments[] shape → component consumers)
T017 → T019              (download endpoint → admin attachment list with links)
T008, T010 → T020 → T021 (mimeToIcon + validateAttachments → FileUpload component)
T021 → T022 → T023       (FileUpload → IdeaForm progress bar)
T017, T019 → T024 → T025 (download endpoint + admin list → admin component tests)
T021, T025 → T026        (FileUpload + admin detail → E2E happy path)
T021 → T027              (FileUpload → E2E validation)
T013, T015, T017, T021, T023, T025 → T028 → T029 → T030 → T031
```

## Parallel Execution Examples

### Phase 2 (all parallel within phase after T001):
```
T001 done →
  ├── T005 → T006   (mimeDetector)
  ├── T007 → T008   (mimeToIcon)
  ├── T009 → T010   (validateAttachments)
  └── T011          (fixture extension)
```

### Phase 3 US1 (partial parallel after T013 and T015):
```
T013 done →
  ├── T014 → T015
T015 done →
  ├── T016 → T017
  └── T018
T017 + T018 → T019
```

### Phase 6 E2E (fully parallel after phase 5 complete):
```
T026 ║ T027
```

### Phase 7 (partially parallel):
```
T028 ║ T029 → T030 → T031
```

## Implementation Strategy

**MVP scope**: Phases 1 + 2 + Phase 3 (US1) — delivers the foundational multi-file submission and admin view with full server-side validation and atomic persistence. Preview and admin download work in basic form (admin list shows file metadata and download links via the new GET endpoint).

**Phase 4 (US2)** adds client-side preview richness and the progress bar — independently deliverable after US1.

**Phase 5 (US3)** adds thumbnail/video previews in the admin detail view — independently deliverable after US1 + the download endpoint.

**Start here** → T001 (constants), which unblocks all foundational and story work.
