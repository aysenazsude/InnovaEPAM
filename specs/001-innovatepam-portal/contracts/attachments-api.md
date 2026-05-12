# Contract: Attachments API

**Base path**: `/api/attachments`
**Auth**: All endpoints require a valid NextAuth session cookie. Requests without a valid session return `401 Unauthorized`.
**Runtime**: Node.js (not Edge — required for filesystem access)

---

## POST /api/attachments

Upload a single file and associate it with an idea. Only one attachment is permitted per idea. Upload is blocked once the idea's status reaches `under_review`, `accepted`, or `rejected`.

### Request

- **Method**: `POST`
- **Content-Type**: `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | File (binary) | Yes | The file to upload. Max 10 MB. |
| `ideaId` | string | Yes | ID of the idea to associate (e.g., `IDEA-0042`). Must belong to the authenticated user. |

### Response — `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "proposal.pdf",
  "fileType": "application/pdf",
  "fileSize": 2097152,
  "uploadedAt": 1747008000
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | `ideaId` or `file` field missing |
| `400 Bad Request` | File MIME type not in `ALLOWED_MIME_TYPES` — body includes `allowedTypes` array |
| `400 Bad Request` | File exceeds 10 MB size limit |
| `401 Unauthorized` | No valid session |
| `403 Forbidden` | `ideaId` does not belong to the authenticated user |
| `403 Forbidden` | Idea status is `under_review`, `accepted`, or `rejected` |
| `404 Not Found` | `ideaId` does not exist |
| `409 Conflict` | An attachment already exists for this idea; remove it before uploading a new one |

**Accepted MIME types**:
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (.pptx)
- `image/png`
- `image/jpeg`

---

## GET /api/attachments/[id]

Download an attachment file. Accessible to the idea's submitter and any admin.

### Request

- **Method**: `GET`
- **Path param**: `id` — attachment UUID
- No body

### Response — `200 OK`

- **Content-Type**: the file's original MIME type
- **Content-Disposition**: `attachment; filename="<original-file-name>"`
- **Body**: raw file bytes

### Error Responses

| Status | Condition |
|--------|-----------|
| `401 Unauthorized` | No valid session |
| `403 Forbidden` | Attachment belongs to an idea not owned by the authenticated submitter (non-admins only) |
| `404 Not Found` | Attachment ID does not exist |

---

## DELETE /api/attachments/[id]

Remove an attachment. Permitted only while idea status is `submitted`. Blocked once status reaches `under_review` or beyond.

### Request

- **Method**: `DELETE`
- **Path param**: `id` — attachment UUID
- No body

### Response — `204 No Content`

### Error Responses

| Status | Condition |
|--------|-----------|
| `401 Unauthorized` | No valid session |
| `403 Forbidden` | Attachment belongs to an idea not owned by the authenticated user |
| `403 Forbidden` | Idea status is `under_review`, `accepted`, or `rejected` |
| `404 Not Found` | Attachment ID does not exist |
