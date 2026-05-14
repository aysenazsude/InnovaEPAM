# API Contract: Draft Management Server Actions — Phase 4

**Branch**: `004-draft-management` | **Date**: 2026-05-14
**Module**: `src/lib/actions/drafts.ts` (Next.js Server Actions)
**Auth requirement**: All actions require an active session (`auth()`). Unauthenticated calls redirect to `/login`.

---

## Overview

This contract defines the server action signatures, input shapes, return types, and error codes for the Draft Management feature. All actions are `'use server'` functions consumed by Client Components via `useActionState` or direct invocation.

---

## Action: `saveDraft`

Creates a new draft (when `draftId` is null) or updates an existing one (when `draftId` is present).

### Signature

```typescript
export async function saveDraft(
  _prevState: SaveDraftResult | null,
  formData: FormData
): Promise<SaveDraftResult>
```

### FormData Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `draftId` | `string \| null` | No | Absent or empty = create new draft |
| `version` | `string` (number) | When updating | Optimistic concurrency token (R-003) |
| `title` | `string` | No | Empty string → stored as null |
| `description` | `string` | No | Empty string → stored as null |
| `category` | `string` | No | Must be valid `CategorySlug` if provided |
| `[categoryFieldName]` | `string` | No | Whitelisted per `CATEGORY_FIELDS[category]` |
| `file` | `File[]` | No | 0–3 files; new files to attach |
| `existingAttachmentIds` | `string[]` | No | IDs of previously saved attachments to keep |

### Return Type

```typescript
export interface SaveDraftResult {
  success?: true;
  draftId?: string;          // Returned on successful create or update
  version?: number;          // New version number after successful save
  errors?: Record<string, string>;  // Field-level validation errors
  limitReached?: true;       // Draft count limit (10) exceeded
  conflict?: true;           // Optimistic concurrency conflict (version mismatch)
  serverError?: true;        // Unexpected server-side error
}
```

### Behaviour

1. **Create** (no `draftId`): Count existing drafts for user. If ≥ 10, return `{ limitReached: true }`. Otherwise INSERT into `drafts`, upsert `draft_category_data`, save new files to disk and INSERT into `draft_attachments`. Return `{ success: true, draftId, version: 1 }`.
2. **Update** (with `draftId` + `version`): UPDATE drafts WHERE `id = draftId AND version = ?`. If 0 rows affected → return `{ conflict: true }`. Otherwise upsert category data, reconcile attachments (add new, delete removed), return `{ success: true, draftId, version: newVersion }`.
3. **File handling**: Files present in `existingAttachmentIds` but no longer in the list are deleted from disk and from `draft_attachments`. New `File` entries are validated (type + size), saved to disk, and inserted.

### Error Scenarios

| Condition | Return value |
|-----------|-------------|
| Not authenticated | `redirect('/login')` |
| Draft count ≥ 10 (create) | `{ limitReached: true }` |
| Version mismatch (update) | `{ conflict: true }` |
| Draft not found or not owned by caller | `{ errors: { _: 'Draft not found' } }` |
| File type violation | `{ errors: { file: 'File type not allowed...' } }` |
| File size violation | `{ errors: { file: 'File must be 10 MB or smaller' } }` |
| Attachment count violation | `{ errors: { file: 'Maximum 3 attachments per draft' } }` |
| Unexpected DB / filesystem error | `{ serverError: true }` |

---

## Action: `getDrafts`

Returns all drafts for the current user, ordered by `updatedAt DESC`.

### Signature

```typescript
export async function getDrafts(): Promise<GetDraftsResult>
```

### Return Type

```typescript
export interface DraftSummary {
  id: string;
  title: string | null;   // null displayed as "Untitled Draft" by the UI
  updatedAt: number;      // Unix epoch ms
  attachmentCount: number;
}

export interface GetDraftsResult {
  drafts?: DraftSummary[];
  atLimit?: true;         // true when count === 10 (UI disables Save Draft)
  serverError?: true;
}
```

---

## Action: `getDraft`

Returns the full content of a single draft for pre-filling the editing form.

### Signature

```typescript
export async function getDraft(draftId: string): Promise<GetDraftResult>
```

### Return Type

```typescript
export interface DraftDetail {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  categoryFields: Record<string, string | null> | null;
  version: number;
  updatedAt: number;
  attachments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    uploadOrderIndex: number;
  }>;
}

export interface GetDraftResult {
  draft?: DraftDetail;
  notFound?: true;    // Draft does not exist or belongs to another user
  serverError?: true;
}
```

### Security

Returns `{ notFound: true }` (not a 403) when the draft exists but belongs to a different user — avoids user enumeration.

---

## Action: `deleteDraft`

Permanently deletes a draft and all associated files from disk.

### Signature

```typescript
export async function deleteDraft(draftId: string): Promise<DeleteDraftResult>
```

### Return Type

```typescript
export interface DeleteDraftResult {
  success?: true;
  notFound?: true;
  serverError?: true;
}
```

### Behaviour

1. Load `draft_attachments` for `draftId` WHERE `submitter_id = currentUserId`.
2. Call `deleteFile(storagePath, uploadDir)` for each attachment.
3. DELETE from `drafts` WHERE `id = draftId AND submitter_id = currentUserId` (CASCADE removes `draft_category_data` and `draft_attachments`).
4. Return `{ success: true }`.

---

## Action: `submitDraftAsIdea`

Promotes a draft to a submitted idea in a single atomic transaction. Equivalent to `submitIdea` but reads content from the draft record rather than fresh FormData.

### Signature

```typescript
export async function submitDraftAsIdea(
  _prevState: SubmitDraftResult | null,
  formData: FormData
): Promise<SubmitDraftResult>
```

### FormData Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `draftId` | `string` | Yes | Draft to promote |
| `version` | `string` (number) | Yes | Concurrency token |
| `title` | `string` | Yes | Required for submission |
| `description` | `string` | Yes | Required for submission |
| `category` | `string` | Yes | Required for submission |
| `[categoryFieldName]` | `string` | No | Whitelisted per category |
| `existingAttachmentIds` | `string[]` | No | Draft attachment IDs to carry over |

### Return Type

```typescript
export interface SubmitDraftResult {
  errors?: Record<string, string>;
  conflict?: true;
  notFound?: true;
  serverError?: true;
  // On success: redirect('/ideas') — no return value reaches the client
}
```

### Behaviour

1. Validate all submission fields (same rules as `submitIdea` — title, description, category required).
2. Open a Drizzle transaction:
   a. INSERT into `ideas`
   b. INSERT into `idea_category_data` (if category fields present)
   c. INSERT all kept `draft_attachments` into `attachments` (file paths unchanged on disk)
   d. DELETE `draft_attachments` WHERE `draft_id = ?`
   e. DELETE `drafts` WHERE `id = ? AND version = ?` (0 rows → throw, triggers rollback → `{ conflict: true }`)
3. On success: `redirect('/ideas')`.
4. On validation failure: return `{ errors }` — draft is NOT deleted.
5. On server error: return `{ serverError: true }` — draft and files survive.

---

## API Route: `GET /api/attachments/[storagePath]`

**Existing** route (Phase 1/3). Draft attachments stored under the same `data/uploads/` directory are served by this same route. No new API route is required for draft attachment serving.

**Note**: The route MUST validate that the requesting user either owns the idea the attachment belongs to (existing check) **or** owns the draft the attachment belongs to (new check). See security note below.

### Security Addition

The existing `/api/attachments/[storagePath]` route currently checks `ideaId → submitter`. It MUST be extended to also allow access when `storagePath` matches a `draft_attachments` record owned by the current user. Admins do NOT have access to draft attachments (FR-023).

```typescript
// Pseudocode for route auth extension:
const draftAttachment = await db.query.draftAttachments.findFirst({
  where: eq(draftAttachments.storagePath, storagePath),
  with: { draft: true },
});
if (draftAttachment && draftAttachment.draft.submitterId === session.user.id) {
  // authorized
}
```
