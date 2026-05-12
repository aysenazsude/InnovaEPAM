# Contract: Evaluation API

**Transport**: Next.js Server Actions (no HTTP endpoints)
**Auth**: All Server Actions verify the caller's session and require `role = 'admin'`. Non-admin callers receive a permission error.

> All evaluation operations are performed via Server Actions called from the admin idea detail page (`/admin/ideas/[id]`). There are no additional HTTP Route Handlers for evaluation.

---

## Server Action: `acceptIdea`

Accept a submitted or under-review idea. Records the admin's comment and transitions the idea status to `accepted`.

### Signature

```typescript
// src/lib/actions/evaluation.ts
export async function acceptIdea(
  ideaId: string,
  comment: string
): Promise<{ success: true } | { success: false; error: string }>
```

### Preconditions

| Condition | Error returned |
|-----------|---------------|
| Caller has no valid session | `'Unauthorized'` |
| Caller's role is not `admin` | `'Forbidden'` |
| `ideaId` does not exist | `'Idea not found'` |
| Idea status is not `submitted` or `under_review` | `'Idea cannot be evaluated in its current status'` |
| `comment` is empty or whitespace-only | `'Comment is required'` |

### Side Effects

1. Sets `ideas.status = 'accepted'`.
2. Sets `ideas.admin_comment = comment` (trimmed).
3. Sets `ideas.evaluating_admin_id = session.user.id`.
4. Sets `ideas.evaluated_at = now` (Unix timestamp).

### Success Response

```typescript
{ success: true }
```

After success, the Server Action calls `revalidatePath('/admin')` and `revalidatePath('/ideas')` so both the admin dashboard and the submitter's listing reflect the new status immediately.

---

## Server Action: `rejectIdea`

Reject a submitted or under-review idea. Records the admin's comment and transitions the idea status to `rejected`.

### Signature

```typescript
// src/lib/actions/evaluation.ts
export async function rejectIdea(
  ideaId: string,
  comment: string
): Promise<{ success: true } | { success: false; error: string }>
```

### Preconditions

| Condition | Error returned |
|-----------|---------------|
| Caller has no valid session | `'Unauthorized'` |
| Caller's role is not `admin` | `'Forbidden'` |
| `ideaId` does not exist | `'Idea not found'` |
| Idea status is not `submitted` or `under_review` | `'Idea cannot be evaluated in its current status'` |
| `comment` is empty or whitespace-only | `'Comment is required'` |

### Side Effects

1. Sets `ideas.status = 'rejected'`.
2. Sets `ideas.admin_comment = comment` (trimmed).
3. Sets `ideas.evaluating_admin_id = session.user.id`.
4. Sets `ideas.evaluated_at = now` (Unix timestamp).

### Success Response

```typescript
{ success: true }
```

After success, calls `revalidatePath('/admin')` and `revalidatePath('/ideas')`.

---

## Server Action: `transitionToUnderReview`

Automatically called when an admin opens an idea with status `submitted`. Transitions the status to `under_review` to signal active evaluation. Idempotent — if the idea is already `under_review`, the action is a no-op.

### Signature

```typescript
// src/lib/actions/evaluation.ts
export async function transitionToUnderReview(
  ideaId: string
): Promise<void>
```

### Preconditions

| Condition | Behaviour |
|-----------|-----------|
| Caller has no valid session | Throws — handled by route-level auth guard |
| Caller's role is not `admin` | No-op (route is already admin-only) |
| Idea status is not `submitted` | No-op — no DB write performed |

### Side Effects

1. If `ideas.status = 'submitted'`: sets `status = 'under_review'` and `evaluating_admin_id = session.user.id`.
2. Calls `revalidatePath('/admin')` and `revalidatePath('/ideas')`.

---

## Concurrent Evaluation Conflict

If two admins attempt to accept/reject the same idea simultaneously, the status column acts as an optimistic lock:

- The first write succeeds (status transitions from `under_review` to `accepted` or `rejected`).
- The second write hits the precondition check (`status NOT IN ('submitted', 'under_review')`) and returns `{ success: false, error: 'Idea cannot be evaluated in its current status' }`.
- The `EvaluationForm` component displays this error and refreshes the page to show the current (already-evaluated) state.
