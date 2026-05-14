# Contract: Multi-Media Attachments API — Phase 3

**Date**: 2026-05-14  
**Feature**: Multi-Media Attachments  
**Base URL**: `/api/attachments`

---

## 1. Download Attachment

Streams a single attachment file to the caller. Enforces ownership-based access control.

### `GET /api/attachments/[id]`

**Path parameter**: `id` — attachment UUID (from `attachments.id` in the database)

**Authentication**: Required — valid NextAuth session cookie  
**Authorization**: Session user must be the idea's original submitter **or** have `role = 'admin'`

#### Success Response `200 OK`

```
Content-Type: <file MIME type>
Content-Disposition: attachment; filename="<original file name>"
Content-Length: <file size in bytes>
<binary file body>
```

#### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | No valid session |
| `403 Forbidden` | `{ "error": "Forbidden" }` | Authenticated but not the submitter or admin |
| `404 Not Found` | `{ "error": "Attachment not found" }` | Attachment ID does not exist |
| `410 Gone` | `{ "error": "File unavailable" }` | Attachment row exists but backing file missing from disk |

---

## 2. Extended Idea Submission (Server Action — `submitIdea`)

The `submitIdea` server action is extended to accept up to 3 files. It is invoked via Next.js `useActionState` from `IdeaForm` — not a REST endpoint.

### Input (`FormData`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | `string` | Yes | Max 100 chars |
| `description` | `string` | Yes | Max 2 000 chars |
| `category` | `string` | Yes | One of the 5 category slugs |
| `file` | `File` | No | 0–3 entries; repeated field name |
| `[category-field-name]` | `string` | No | Category-specific fields (Phase 2) |

`file` entries are read via `formData.getAll('file')` returning `File[]`.

### Success

Redirects to `/ideas/<new-idea-id>`.

### Error Response Shape

```typescript
{
  errors?: {
    title?: string;
    description?: string;
    category?: string;
    files?: string;           // count or total-size violation
    totalSize?: string;       // total combined size exceeded
    [fileName: string]?: string; // per-file error keyed by file.name
    [categoryFieldName: string]?: string;
  }
}
```

### Validation order (server-side)

1. Authenticate session — redirect to `/login` if not authenticated
2. Validate shared fields (title, description, category) via `validateIdea`
3. Detect MIME types from magic bytes via `detectMimeType` for each file
4. Validate all files via `validateAttachments` — return `errors` if any file or total fails
5. Insert idea, category data, and all attachments inside a single `db.transaction`
6. If any disk write fails, transaction rolls back; return a generic submission error

---

## 3. Extended Idea Detail Response (Server Action — `getIdeaById`)

`getIdeaById` now returns `attachments: Attachment[]` (array) instead of the Phase 1 `attachment: Attachment | null`. Components consuming this action must be updated.

### `IdeaWithAttachments` shape

```typescript
interface IdeaWithAttachments {
  // --- Idea fields (unchanged) ---
  id: string;
  numericId: number;
  title: string;
  description: string;
  category: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  submitterId: string;
  submittedAt: number;          // Unix timestamp
  adminComment: string | null;
  evaluatingAdminId: string | null;
  evaluatedAt: number | null;

  // --- Phase 3: plural attachments ---
  attachments: {
    id: string;
    ideaId: string;
    fileName: string;
    fileType: string;           // MIME type
    fileSize: number;           // bytes
    storagePath: string;
    uploadOrderIndex: number;
    uploadedAt: number;
  }[];                          // ordered by uploadOrderIndex ASC

  // --- Phase 2 ---
  categoryData: {
    ideaId: string;
    category: string;
    fields: Record<string, string | null>;
    createdAt: number;
  } | null;
}
```

---

## 4. Admin Idea List Response (`getAdminIdeas` / `getMyIdeas`)

Both actions return `IdeaWithAttachments[]` using the same shape as §3. Card-level views only need `attachments.length` to show an attachment count badge; full metadata is available for detail views.
