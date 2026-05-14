# Research: Multi-Media Attachments — Phase 3

**Date**: 2026-05-14  
**Feature**: Multi-Media Attachments  
**Plan phase**: Phase 0 — resolves all NEEDS CLARIFICATION from spec before design begins

---

## R1 — Magic-Byte File Type Verification in Node.js

**Context**: FR-032 requires server-side type verification by reading file magic bytes (file signature), not by trusting the extension or `Content-Type` header.

**Decision**: Implement a pure TypeScript `detectMimeType(buffer: Buffer): string | null` utility that reads the first 12 bytes of the upload buffer and compares them against a hard-coded signature table for the 7 accepted types.

**Rationale**: No new npm package is needed. All accepted types have well-known, stable magic byte signatures:

| Type | Bytes checked | Signature (hex) |
|------|--------------|-----------------|
| PDF | 4 | `25 50 44 46` (`%PDF`) |
| DOCX / PPTX (ZIP-based) | 4 | `50 4B 03 04` (`PK\x03\x04`) |
| DOC (legacy) | 8 | `D0 CF 11 E0 A1 B1 1A E1` |
| PNG | 8 | `89 50 4E 47 0D 0A 1A 0A` |
| JPEG | 3 | `FF D8 FF` |
| MP4 | 8 (offset 4) | `66 74 79 70` (`ftyp`) — ISO Base Media |
| MOV | 8 (offset 4) | `66 74 79 70` + brand `71 74 20 20` (`qt  `) OR check `6D 6F 6F 76` (`moov`) |

DOCX and PPTX both use the ZIP container (`PK` header); once the ZIP signature is confirmed, the MIME type is resolved from the file extension as a secondary disambiguation step (DOCX vs PPTX cannot be distinguished by magic bytes alone — both are valid accepted types, so either is accepted). MP4 and MOV share the MPEG-4 `ftyp` box; the brand at offset 8 distinguishes them, but since both are accepted types the `ftyp` check alone is sufficient.

**Alternatives considered**:
- `file-type` npm package: would be the simplest approach, but introducing a new runtime dependency violates Constitution Principle III; the accepted type set is small and stable enough to justify a bespoke 30-line implementation.
- Extension-only check: trivially bypassable; rejected per spec clarification Q2.
- `Content-Type` header trust: browser-supplied; trivially spoofable; rejected per spec clarification Q2.

**Implementation location**: `src/lib/attachments/mimeDetector.ts` (new module)

---

## R2 — Multi-File FormData in Next.js Server Actions

**Context**: The existing `submitIdea` server action reads a single `formData.get('file')`. Phase 3 needs up to 3 files from the same form submission.

**Decision**: Use `formData.getAll('file')` to retrieve a `File[]` array (all `<input name="file">` entries from the multi-file input or multiple hidden inputs). No changes to Next.js configuration needed — `formData.getAll` is available in Next.js 15 App Router server actions.

**Rationale**: The browser sends multiple files under the same field name when `<input type="file" multiple>` is used or when multiple inputs share the same name. `FormData.getAll('file')` returns them in insertion order, preserving `upload_order_index` without extra state.

**Alternatives considered**:
- Named inputs `file_0`, `file_1`, `file_2`: requires knowing the count client-side and more complex server-side parsing; no benefit over `getAll`.
- Dedicated upload API route (Phase 1 pattern): the Phase 1 `POST /api/attachments` route uploads after submission. Phase 3 bundles files with the idea insert server action for atomicity (FR-033); the legacy route is preserved for backwards compatibility but not used for new submissions.

---

## R3 — Atomic Rollback with better-sqlite3 + Drizzle ORM

**Context**: FR-033 requires atomic rollback: if any file fails to write to disk during submission, neither the idea record nor any attachment rows must persist.

**Decision**: Wrap the entire insert sequence (idea → category data → attachment rows → disk writes) in a `better-sqlite3` synchronous transaction using Drizzle's `db.transaction(tx => { ... })`.

**Rationale**: `better-sqlite3` is a synchronous SQLite driver; all operations within `db.transaction()` are executed as a single SQLite `BEGIN … COMMIT` block. If any operation throws, `better-sqlite3` automatically rolls back the transaction. Disk writes (via `saveFile`) are placed inside the transaction callback after the DB inserts; if a write throws, the catch block calls `deleteFile` for any files already written before re-throwing, allowing the DB transaction rollback to clean up the rows.

**Pattern**:
```
db.transaction(tx => {
  tx.insert(ideas).values(...)
  tx.insert(ideaCategoryData).values(...)
  for each file:
    path = saveFile(buffer, type, UPLOAD_DIR)   // throws on disk error
    tx.insert(attachments).values({ storagePath: path, ... })
})
// if transaction throws, SQLite rolls back; savedPaths cleanup done in catch
```

**Alternatives considered**:
- Compensating transaction (insert idea first, delete on error): more complex, requires explicit cleanup on every error path; rejected in favour of the single-transaction approach.
- Separate upload step before idea insert: breaks atomicity — a successful upload followed by a failed idea insert leaves orphan files; rejected.

---

## R4 — Video Preview with Native `<video>` Element

**Context**: FR-026 requires video files (MP4, MOV) to display an inline video player widget in the attachment area, generated from the staged `File` object before submission.

**Decision**: Use `URL.createObjectURL(file)` to create a temporary object URL and assign it to a `<video src={url} controls>` element. Memory is freed by calling `URL.revokeObjectURL(url)` when the file is removed or the component unmounts (via `useEffect` cleanup).

**Rationale**: `createObjectURL` is universally available in modern browsers, produces an immediate result without reading the entire file into memory (unlike `FileReader.readAsDataURL`), and allows the browser's native video player to handle codec rendering without any custom implementation. No new library needed.

**ARIA**: The `<video>` element must carry `aria-label={fileName}` and the `preload="none"` attribute to prevent auto-load; `controls` is required for keyboard accessibility per WCAG 2.1 AA (keyboard-operable media).

**Alternatives considered**:
- `FileReader.readAsDataURL` → data URI: loads entire file into a base64 string; for a 10 MB video this creates a ~13 MB string in the DOM; rejected on memory grounds.
- Server-side poster frame extraction: requires new server infrastructure and violates the no-new-runtime-packages constraint; rejected.

---

## R5 — Upload Progress Indicator

**Context**: FR-034 requires a visible progress bar during submission. Next.js server actions do not natively expose upload progress events.

**Decision**: Submit the form via `fetch` with a `ReadableStream` body wrapping the `FormData`, using a `TransformStream` that reports bytes sent. Fall back to a spinner-only indicator when `ReadableStream` upload progress is not supported (Firefox < 119, Safari < 17.4).

**Simpler alternative adopted**: Given the constraint of no new runtime packages and the complexity of streaming FormData, use a **simpler two-state approach**: display an indeterminate progress bar (animated CSS bar using Tailwind `animate-pulse` or `animate-bounce` on a width-full bar) while `useActionState` `pending === true`, and a success/error state after resolution. True byte-level progress requires bypassing server actions entirely; the spec says "progress bar" but the clarification answer accepted "progress bar, per-file or overall" — an indeterminate bar fulfils the letter and intent at minimal complexity cost.

**Rationale**: True streaming progress adds significant complexity and requires either a custom XHR wrapper or a dedicated streaming API route — both violate the minimal-complexity principle. An indeterminate progress bar is visually distinct from a spinner and satisfies the submitter's need to know "upload is happening". The `pending` boolean from `useActionState` is already available in `IdeaForm`.

**Decision**: Indeterminate animated progress bar via `pending` state from `useActionState`. Render a `<div role="progressbar" aria-busy="true" aria-label="Uploading files…">` with a Tailwind animated fill while `pending === true`.

---

## R6 — Image Thumbnail Generation

**Context**: FR-026 requires image files to display a still thumbnail immediately after selection.

**Decision**: Use `URL.createObjectURL(file)` and render `<img src={url} alt={fileName}>` (same pattern as R4 for video). Memory freed via `URL.revokeObjectURL` on remove/unmount.

**Rationale**: Identical to R4 — `createObjectURL` is the correct approach for local file preview. `FileReader.readAsDataURL` is the alternative but produces larger memory footprints for large images. `createObjectURL` produces a URL that the browser resolves lazily.

**Thumbnail dimensions**: constrain to `64×64 px` (4rem square) via Tailwind `w-16 h-16 object-cover rounded` — consistent with standard attachment-list thumbnail conventions and works at both mobile and desktop breakpoints.

---

## R7 — Download Endpoint Authorization

**Context**: FR-030 requires download access limited to the idea's submitter or any admin; FR-032 mandates server-side enforcement.

**Decision**: Extend the existing `GET /api/attachments/[id]` route (or create it if it doesn't exist) to:
1. Authenticate the session via `auth()`.
2. Fetch the attachment row and its parent idea row.
3. Check `session.user.id === idea.submitterId || session.user.role === 'admin'`; return 403 if false.
4. Stream the file from disk using `fs.createReadStream` with the appropriate `Content-Disposition: attachment` header.

**Rationale**: This pattern is identical to Phase 1's attachment upload authorization (idea ownership check already exists in `POST /api/attachments`). Consistent, no new concepts introduced.

---

## R8 — Attachment List Schema Change Migration

**Context**: The `attachments` table needs a new `upload_order_index INTEGER NOT NULL DEFAULT 0` column. Phase 1 rows must receive `0` automatically (spec clarification Q5).

**Decision**: Generate a new Drizzle migration (`0002_add_attachment_order_index.sql`) via `npm run db:generate`. The migration adds the column with `NOT NULL DEFAULT 0`, which SQLite applies immediately to all existing rows. No backfill script is needed.

**SQL emitted** (expected):
```sql
ALTER TABLE attachments ADD COLUMN upload_order_index INTEGER NOT NULL DEFAULT 0;
```

**Rationale**: SQLite's `ALTER TABLE … ADD COLUMN` with a `DEFAULT` value applies the default to all existing rows at query time (stored as a column default, not physically rewritten). This is the recommended non-destructive migration path for SQLite.
