# Feature Specification: Multi-Media Attachments — Phase 3

**Feature Branch**: `003-multimedia-attachments`
**Created**: 2026-05-14
**Status**: Draft
**Scope**: Phase 3 — Multiple file attachments with inline preview for idea submissions

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Attach Multiple Files to an Idea Submission (Priority: P1)

An authenticated submitter opens the idea submission form and attaches more than one file to their idea. Each file is independently validated for type and size. All valid attached files are submitted together with the idea and persisted for admin review.

**Why this priority**: The single-attachment limit from Phase 1 is the constraint being removed here. This is the foundational change that defines the feature; all other stories depend on there being multiple files to preview or display.

**Independent Test**: A tester logs in as a submitter, opens the submission form, attaches three separate files of different types, submits the idea, then logs in as an admin and verifies all three attachments appear on the idea detail page — without requiring any other feature change.

**Acceptance Scenarios**:

1. **Given** an authenticated submitter is on the submission form, **When** they attach two or more files each within type and size limits, **Then** all attached files appear in the attachment area and the form is submittable.
2. **Given** a submitter has reached the maximum of 3 attachments, **When** they attempt to add another file, **Then** the system prevents the addition and displays a message stating the 3-file attachment limit has been reached.
3. **Given** a submitter selects a file exceeding 10 MB, **When** that file is added, **Then** that specific file is rejected with a size-limit error; all other already-attached files remain in the list unaffected.
4. **Given** a submitter selects a file of an unsupported type, **When** that file is added, **Then** that file is rejected with a type error; all other already-attached files remain unaffected.
5. **Given** a submitter attempts to add a file whose name is already present in the pending attachment list, **When** the duplicate is selected, **Then** the second addition is rejected with a clear message; the original file remains in the list.
6. **Given** a submitter has attached multiple valid files and submits the idea, **When** the submission succeeds, **Then** all files are persisted and associated with the idea; the submitter is returned to their idea listing.
7. **Given** a submitter submits an idea without any attached files, **When** the submission completes, **Then** the idea is saved normally with zero attachments (attachments remain optional, consistent with Phase 1).

---

### User Story 2 — Preview Attachments Before Submission (Priority: P2)

Each file added to the attachment area is immediately previewed inline: image files show a thumbnail, and all other file types display a file-type icon alongside the file name and formatted size. Any individual file can be removed without affecting the rest of the attachment list or the shared form fields.

**Why this priority**: Preview gives submitters confidence that they have selected the correct files before sending. Individual removal prevents having to clear and re-attach the entire set just to correct one file.

**Independent Test**: A tester attaches one image file (JPG), one PDF, and one video file (MP4). They verify that the image displays as a thumbnail, the PDF shows its name and size with a document icon, and the video displays a video player widget. They remove the PDF and verify the image thumbnail and video player remain intact and the form remains submittable.

**Acceptance Scenarios**:

1. **Given** a submitter attaches an image file (PNG or JPG), **When** the file is added, **Then** an inline thumbnail of that image is displayed within the attachment list entry alongside the file name and formatted size.
2. **Given** a submitter attaches a document file (PDF, DOCX, PPTX), **When** the file is added, **Then** a file-type icon appropriate to that type is shown alongside the file name and formatted size; no thumbnail is attempted.
3. **Given** a submitter attaches a video file (MP4 or MOV), **When** the file is added, **Then** an inline video player widget is shown within the attachment list entry alongside the file name and formatted size; the video does not auto-play.
4. **Given** a submitter has one or more files in the attachment area, **When** they activate the remove control on an individual file, **Then** only that file is removed; all other attached files and all shared form field values (title, description, category) are preserved.
5. **Given** a submitter removes all attached files one by one, **When** the last file is removed, **Then** the attachment area returns to its empty initial state and new files may be added.
6. **Given** a submitter's browser has JavaScript disabled, **When** they open the submission form, **Then** a standard native file input accepting multiple files is shown with no preview; the form remains fully functional for submission.

---

### User Story 3 — Admin Views All Attachments on Idea Detail (Priority: P3)

When an admin opens an idea, all attached files are listed in the attachment section with their names, types, and sizes. Each file can be individually downloaded for review.

**Why this priority**: Admins need access to all supporting files to make an informed evaluation decision. This story closes the submission loop, ensuring everything the submitter attached is fully accessible to evaluators.

**Independent Test**: A tester submits an idea with three files (one image, one PDF, one DOCX). An admin logs in, opens the idea, verifies three entries appear in the attachment section with correct metadata, and successfully downloads each one.

**Acceptance Scenarios**:

1. **Given** an admin opens an idea with multiple attachments, **When** the detail page loads, **Then** all attachments are listed in the attachment section, each showing file name, file type, and formatted size.
2. **Given** an admin clicks the download control for an attachment, **When** the download is initiated, **Then** the correct file is downloaded to their device without error.
3. **Given** an admin opens an idea that has no attachments, **When** the detail page loads, **Then** the attachment section shows a "no attachments" message; no download controls are rendered.
4. **Given** an admin opens an idea with one or more image attachments, **When** the detail page loads, **Then** each image attachment displays an inline thumbnail in the attachment list, consistent with the submitter-side preview (User Story 2).
5. **Given** an admin opens an idea with one or more video attachments, **When** the detail page loads, **Then** each video attachment displays an inline video player widget in the attachment list, consistent with the submitter-side preview (User Story 2).

---

### Edge Cases

- What happens when a file fails to stage client-side (e.g., read error during thumbnail generation)? The system MUST display an inline error for that file and exclude it from the attachment list; all other already-staged files MUST remain unaffected.
- What happens when the total combined size of all pending files exceeds the combined limit? The system MUST reject the submission with a clear total-size error; individually valid files MUST NOT be removed from the attachment area, so the submitter can remove some files and retry.
- What happens if the submitter closes or navigates away from the page while an upload is in progress? The in-flight request is aborted; no partial idea or attachment MUST be persisted (consistent with FR-033 atomic rollback); the submitter is not warned before navigation in Phase 3 (unsaved-changes guard is deferred).
- What happens when a file fails server-side storage during submission (e.g., a storage write error mid-upload)? The entire submission MUST be rolled back atomically — no partial idea or partial attachment set is persisted; the submitter is shown a clear error with the option to retry.
- What happens when a submitter uses the browser back button after a successful submission? The submission form MUST display in its empty initial state; the previously submitted idea and all its attachments are unaffected.
- What happens when an admin attempts to download an attachment whose backing file has been deleted from storage? The system MUST return a clear "file unavailable" error rather than a silent failure or corrupted download.
- What happens when a submitter attempts to download an attachment belonging to another user's idea (e.g., by manipulating the URL)? The system MUST return a 403 Forbidden response; no file content or metadata MUST be revealed.

---

## Clarifications

### Session 2026-05-14

- Q: What is the maximum number of files a submitter may attach to a single idea? → A: **3 files** per idea submission; the add-file control MUST be disabled once 3 files are pending in the attachment list.
- Q: Should Phase 3 expand accepted file types beyond the Phase 1 set? → A: **Yes — Phase 1 types plus video** (MP4, MOV); the full accepted set is PDF, DOCX, PPTX, PNG, JPG, MP4, MOV. Video files display an inline video player widget (not a still thumbnail) in the preview area; per-file size limit remains 10 MB for all types.
- Q: Who is authorized to download an idea's attachments via the download endpoint? → A: **Submitter + admin** — only the submitter who owns the idea and any admin role may access attachment downloads; any other authenticated user who requests an attachment belonging to another submitter's idea MUST receive a 403 Forbidden response.
- Q: How must the server verify that an uploaded file matches its declared type? → A: **Magic bytes** — the server MUST read the first bytes of the uploaded buffer and compare the file signature against the known signatures for each accepted type; extension and `Content-Type` header MUST NOT be trusted as the sole verification method; a file whose magic bytes do not match an accepted type MUST be rejected with a 422 Unprocessable Entity response regardless of its declared extension.
- Q: What upload feedback is shown to the submitter while files are being sent to the server? → A: **Progress bar** — a visible progress indicator (per-file or overall) MUST be displayed while the submission is in flight; the Submit button MUST be disabled for the duration; the progress indicator MUST be dismissed and replaced by a success or error state once the server responds.
- Q: What ARIA live region strategy applies to the attachment list and its validation errors? → A: **Polite list, assertive errors** — the attachment list container MUST carry `aria-live="polite"` so that add/remove/count-remaining announcements are non-interrupting; each per-file inline validation error MUST use `role="alert"` (`aria-live="assertive"`) so that rejection messages interrupt the screen reader immediately; this is consistent with the Phase 2 ARIA pattern already established in the spec.
- Q: How should the new `upload_order_index` column be handled for existing Phase 1 attachment rows in the database migration? → A: **`NOT NULL DEFAULT 0`** — the column MUST be added as `NOT NULL` with a default value of `0`; existing single-attachment rows receive index 0 automatically via the migration default; no separate backfill script is required.

---

## Requirements *(mandatory)*

### Functional Requirements

**Multiple Attachments**

- **FR-021**: Authenticated submitters MUST be able to attach up to **3 files** per idea submission; once 3 files are pending the add-file control MUST be disabled and display a message stating the limit has been reached; the single-file restriction from Phase 1 (FR-008) is superseded by this requirement.
- **FR-022**: Each attached file MUST be independently validated against the accepted file types — **PDF, DOCX, PPTX, PNG, JPG, MP4, MOV** — and a maximum per-file size of 10 MB; files failing validation MUST be rejected individually with a specific inline error message; all other already-attached valid files MUST remain in the pending attachment list.
- **FR-023**: The total combined size of all attachments for a single idea MUST NOT exceed 30 MB (reflecting the maximum of 3 files × 10 MB per file); submissions that exceed this total MUST be rejected with a clear combined-size error message naming the limit.
- **FR-024**: Attaching zero files MUST remain valid; attachments are optional (consistent with Phase 1 FR-010).
- **FR-025**: The system MUST detect and reject duplicate file names within the same pending attachment list; if a submitter attempts to add a file whose name already exists in the current list, the addition MUST be blocked with a clear message; the original file MUST remain listed.

**Preview**

- **FR-026**: Immediately after a file is added to the attachment list, the attachment area MUST render an inline preview according to file type: image files (PNG, JPG) MUST display a still thumbnail; video files (MP4, MOV) MUST display a video player widget that does not auto-play; document files (PDF, DOCX, PPTX) MUST display a file-type icon; every entry MUST show the file name and formatted file size alongside the preview.
- **FR-027**: Each file in the attachment list MUST have an individual remove control; activating it MUST remove only that file; all other pending files and all shared form field values MUST remain unchanged.
- **FR-028**: When JavaScript is unavailable, the attachment area MUST degrade to a standard native multi-file input; preview is not required; submission MUST remain fully functional.

**Admin View**

- **FR-029**: The admin idea detail view MUST list all attachments for an idea, displaying file name, file type, and formatted size for each entry.
- **FR-030**: Each listed attachment MUST be individually downloadable via a dedicated download control; the download endpoint MUST enforce that only the idea's original submitter or any admin role may retrieve the file — any other authenticated user MUST receive a 403 Forbidden response with no file content.
- **FR-031**: Image attachments in the admin detail view MUST display an inline thumbnail; video attachments MUST display an inline video player widget that does not auto-play — both consistent with the submitter-side preview rules in FR-026.

**Validation & Integrity**

- **FR-032**: All file validations (type, per-file size, total combined size, duplicate name, count limit) MUST be enforced both client-side (immediate feedback on file selection) and server-side. Server-side type verification MUST be performed by inspecting the file's **magic bytes** (file signature read from the first bytes of the uploaded buffer); the file extension and the `Content-Type` request header MUST NOT be used as the sole type check. Files whose magic bytes do not match an accepted type MUST be rejected with a 422 Unprocessable Entity response and a structured error `{ errors: { fieldName: "message" } }`.
- **FR-033**: If any file fails server-side storage during submission, the entire submission MUST be rolled back atomically; no partial idea record or partial attachment set MUST be persisted.
- **FR-034**: While a submission containing attachments is in flight to the server, the submission form MUST display a visible progress indicator (progress bar, per-file or overall); the Submit button MUST be disabled for the duration of the upload; when the server responds the progress indicator MUST be replaced by either a success redirect or inline error messages without a full page reload.
- **FR-035**: The attachment list container MUST carry `aria-live="polite"` so that file-added, file-removed, and count-remaining-change announcements are delivered non-interruptingly to screen readers; each per-file inline validation error element MUST use `role="alert"` (equivalent to `aria-live="assertive"`) so that rejection messages are announced immediately; this pattern MUST be applied consistently with the Phase 2 ARIA guidance-text and error conventions.

### Key Entities

- **Attachment** (extended from Phase 1): Unique attachment ID, idea reference, file name, file type (MIME type), file size in bytes, storage reference, upload order index (`NOT NULL`, integer, default 0 for Phase 1 migrated rows, sequential from 0 for new multi-file submissions), uploaded timestamp.

---

## Testing Strategy *(mandatory — aligned with Constitution v1.4.1, Principles IV–XI)*

All implementation MUST follow the RED-GREEN-REFACTOR cycle. Tests are written BEFORE implementation code; expectations are derived from the acceptance scenarios above.

### Test Layer Breakdown

#### Unit Tests (`tests/unit/`)

| Source module | Test file | What is verified |
|---|---|---|
| `src/lib/attachments/attachmentValidator.ts` (extended) | `tests/unit/lib/attachments/attachmentValidator.test.ts` (extended) | Multi-file count limit; per-file type/size rejection returns individual errors; total-size limit; duplicate name detection; zero-attachment valid |
| `src/components/ideas/FileUpload.tsx` (extended) | `tests/unit/components/ideas/FileUpload.test.tsx` (extended) | Renders thumbnail for images; video player widget for MP4/MOV; icon for documents; remove control per file; 3-file count-limit error; duplicate-name error; no-JS fallback renders plain multi-file input |

#### Integration Tests (`tests/integration/`)

| Test file | What is verified |
|---|---|
| `tests/integration/attachments/upload.test.ts` (extended) | Multi-file submission persists all files; per-file type/size rejection leaves valid files intact; total-size rejection; duplicate name rejection; atomic rollback on storage failure |
| `tests/integration/ideas/list.test.ts` (extended) | Admin detail returns all attachment metadata; individual download endpoint returns correct file |

#### E2E Tests (`tests/e2e/`)

| Playwright spec file | Scope |
|---|---|
| `tests/e2e/ideas/submitter-attaches-multiple-files.spec.ts` | Attach 3 files (one JPG, one PDF, one MP4) → verify image thumbnail, document icon, and video player widget render correctly → remove PDF → submit → admin sees 2 attachments with correct metadata and previews |
| `tests/e2e/ideas/attachment-validation.spec.ts` | Exceed 3-file count limit; attach oversized file; attach unsupported type; add duplicate name — verify individual inline errors; valid files remain unaffected |

### Quality Gates (Constitution Principles V & X)

| Gate | Target | Enforcement |
|---|---|---|
| Line coverage | ≥ 80% | `jest.config.ts` → `coverageThreshold` |
| Branch coverage | ≥ 75% | Same |
| Mutation score | ≥ 75% | `stryker run` on `main` push |
| Unit test runtime | < 1 s per test | Jest `--verbose` reviewed in PR |
| Integration test runtime | < 5 s per test | Same |
| Tautological assertions | 0 | `eslint-plugin-jest` at lint time |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A submitter can attach the maximum permitted number of files, see inline previews for all of them, and complete submission in under 2 minutes.
- **SC-002**: Image thumbnails render within 500 milliseconds of file selection on a standard desktop device.
- **SC-003**: 90% of submitters successfully attach multiple files on their first attempt without triggering an unintended validation error, as measured by task-completion rate in usability testing.
- **SC-004**: An admin can view and initiate download of all attachments on an idea detail page within 30 seconds of opening the page.
- **SC-005**: The attachment area is fully functional and visually correct at desktop (≥ 1280px) and mobile (≥ 320px) screen widths.
- **SC-006**: A submission carrying 3 files each at the 10 MB per-file ceiling (30 MB total) completes within 5 seconds under standard broadband conditions (≥ 10 Mbps).

---

## Assumptions

- Per-file size limit is 10 MB, consistent with Phase 1; this limit is not revisited in Phase 3.
- Total combined attachment size limit is 30 MB per idea submission (3 files × 10 MB each).
- Maximum attachment count is 3 files per idea (resolved in specification session 2026-05-14).
- Accepted file types are PDF, DOCX, PPTX, PNG, JPG, MP4, MOV (resolved in specification session 2026-05-14); audio types (MP3, WAV) are out of scope for Phase 3.
- The Phase 1 single-attachment storage infrastructure is extended in place; no external storage service is introduced.
- Submitters cannot edit attachments on ideas that have already been submitted; multi-file management applies to the pre-submission flow only.
- Thumbnail generation for image previews is performed in the browser using the native `FileReader` / `createObjectURL` API; no server-side image processing is required for preview.
- Video player widgets use the browser's native `<video>` element with the staged file as the source; no server-side transcoding is required.
- The `upload_order_index` column is added to the existing `attachments` table as `NOT NULL DEFAULT 0`; existing Phase 1 single-attachment rows receive index 0 automatically; no backfill script is required.
- Attachment ordering in both the submitter and admin views follows insertion order; no reordering UI is provided.
- Notifications about new or changed attachments are out of scope (consistent with Phase 1).
