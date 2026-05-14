# Contract: Review Pipeline API

Server actions exposed by `src/lib/actions/pipeline.ts`.

All actions require the caller to be authenticated as `role: 'admin'` unless otherwise noted.
All actions accept an optional `dbInstance: DB = db` parameter for testability (integration test pattern).

---

## `startPipelineReview`

**Purpose**: Transitions a `submitted` idea into the `screening` stage, beginning the multi-stage pipeline.

**Input**:
```typescript
startPipelineReview(
  ideaId: string,
  dbInstance?: DB
): Promise<PipelineActionResult>
```

**Auth**: Admin only. Redirects to `/login` if unauthenticated; redirects to `/ideas` if not admin.

**Side effects**:
- Updates `ideas.status` → `screening`
- Updates `ideas.evaluatingAdminId` → `session.user.id`
- Inserts one row into `stage_transitions` (`action: 'advanced'`, `stage: 'screening'`, `notes: 'Pipeline review started'`)
- Calls `revalidatePath('/admin/ideas')`

**Output**:
```typescript
type PipelineActionResult = {
  error?: string;   // e.g. 'Idea not found' | 'Idea is not in submitted state' | 'Conflict: idea was moved by another reviewer'
  conflict?: true;
}
```

**Error cases**:
- Idea not found → `{ error: 'Idea not found' }`
- `status !== 'submitted'` → `{ error: 'Idea is not in submitted state' }`

---

## `advanceStage`

**Purpose**: Advances a pipeline idea from its current stage to the next stage. Records the reviewer's notes.

**Input**:
```typescript
advanceStage(
  prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance?: DB
): Promise<PipelineActionResult>

// FormData fields:
// ideaId: string
// expectedStatus: PipelineStage   ← optimistic lock token
// notes: string                   ← mandatory, min 1 char
```

**Auth**: Admin only.

**Validation**:
- `notes`: required, 1–2000 characters

**Side effects** (inside one transaction):
- Reads current `status` from `ideas`; aborts with `{ conflict: true }` if `status !== expectedStatus`
- Updates `ideas.status` → next stage (screening→technical_review, technical_review→business_review, business_review→final_decision)
- Inserts one row into `stage_transitions` (`action: 'advanced'`, `stage: currentStage`, `notes`)
- Calls `revalidatePath('/admin/ideas/[id]')`

**Output**: `PipelineActionResult`

**Error cases**:
- Conflict → `{ conflict: true }`
- `notes` empty → `{ error: 'Notes are required' }`
- Invalid transition (e.g., `final_decision → next`) → `{ error: 'No further stages available' }`

---

## `approveAtFinalDecision`

**Purpose**: Approves an idea at the `final_decision` stage, moving it to the terminal `approved` state.

**Input**:
```typescript
approveAtFinalDecision(
  prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance?: DB
): Promise<PipelineActionResult>

// FormData fields:
// ideaId: string
// expectedStatus: 'final_decision'
// notes: string   ← mandatory approval notes
```

**Auth**: Admin only.

**Side effects** (inside one transaction):
- Conflict check: `ideas.status !== 'final_decision'` → `{ conflict: true }`
- Updates `ideas.status` → `approved`
- Updates `ideas.evaluatedAt` → `Math.floor(Date.now() / 1000)`
- Inserts `stage_transitions` (`action: 'approved'`, `stage: 'final_decision'`, `notes`)
- Calls `revalidatePath`

**Output**: `PipelineActionResult`

---

## `rejectAtStage`

**Purpose**: Rejects a pipeline idea at any pipeline stage. Moves idea to terminal `rejected` state.

**Input**:
```typescript
rejectAtStage(
  prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance?: DB
): Promise<PipelineActionResult>

// FormData fields:
// ideaId: string
// expectedStatus: PipelineStage
// notes: string   ← mandatory rejection notes
```

**Auth**: Admin only.

**Side effects** (inside one transaction):
- Conflict check (same pattern)
- Updates `ideas.status` → `rejected`
- Updates `ideas.evaluatedAt` → current time
- Inserts `stage_transitions` (`action: 'rejected'`, `stage: currentStage`, `notes`)
- Calls `revalidatePath`

**Output**: `PipelineActionResult`

---

## `requestClarification`

**Purpose**: Pauses pipeline review at the current stage and asks the submitter for clarification.

**Input**:
```typescript
requestClarification(
  prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance?: DB
): Promise<PipelineActionResult>

// FormData fields:
// ideaId: string
// expectedStatus: PipelineStage
// question: string   ← mandatory, max 1000 chars
// notes: string      ← internal notes for the audit trail (required)
```

**Auth**: Admin only.

**Side effects** (inside one transaction):
- Conflict check
- Inserts row into `clarification_requests`
- Updates `ideas.status` → `awaiting_clarification`
- Updates `ideas.activeClarificationId` → new request id
- Inserts `stage_transitions` (`action: 'awaiting_clarification'`, `stage: currentStage`, `notes`)
- Calls `revalidatePath`

**Output**: `PipelineActionResult`

---

## `cancelClarification`

**Purpose**: Admin cancels an outstanding clarification request. Idea reverts to the stage it was at when the request was created.

**Input**:
```typescript
cancelClarification(
  prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance?: DB
): Promise<PipelineActionResult>

// FormData fields:
// ideaId: string
// clarificationId: string
// notes: string   ← required reason for cancellation
```

**Auth**: Admin only.

**Side effects** (inside one transaction):
- Loads `clarificationRequests` row; verifies `pending` (response IS NULL AND cancelledAt IS NULL)
- Sets `clarification_requests.cancelled_at` and `cancelled_by_id`
- Reverts `ideas.status` → `clarificationRequest.stageWhenRequested`
- Clears `ideas.activeClarificationId` → NULL
- Inserts `stage_transitions` (`action: 'clarification_cancelled'`, `stage: stageWhenRequested`, `notes`)
- Calls `revalidatePath`

**Output**: `PipelineActionResult`

---

## `respondToClarification`

**Purpose**: Submitter responds to an outstanding clarification request.

**Auth**: Submitter who owns the idea. Redirects to `/login` if unauthenticated; returns `{ error: 'Not authorized' }` if caller is not the idea's submitter.

**Input**:
```typescript
respondToClarification(
  prevState: PipelineActionResult | null,
  formData: FormData,
  dbInstance?: DB
): Promise<PipelineActionResult>

// FormData fields:
// ideaId: string
// clarificationId: string
// response: string   ← required, 1–2000 chars
```

**Side effects** (inside one transaction):
- Loads `clarificationRequests` row; verifies `pending`
- Sets `clarification_requests.response`, `responder_id`, `responded_at`
- Reverts `ideas.status` → `stageWhenRequested`
- Clears `ideas.activeClarificationId` → NULL
- Inserts `stage_transitions` (`action: 'clarification_resolved'`, `stage: stageWhenRequested`, `notes: response`)
- Calls `revalidatePath`

**Output**: `PipelineActionResult`

---

## `getPipelineHistory`

**Purpose**: Returns the full ordered stage transition history for an idea. Used by both the admin review page and the submitter idea detail page.

**Auth**: Admin may fetch any idea. Submitter may only fetch their own ideas.

**Input**:
```typescript
getPipelineHistory(ideaId: string, dbInstance?: DB): Promise<StageTransitionView[]>

type StageTransitionView = {
  id: string;
  stage: string;
  action: string;
  notes: string;
  adminDisplayName: string;
  createdAt: number;
}
```

---

## `getPipelineCounts`

**Purpose**: Returns counts of pipeline ideas grouped by their current status. Used by the admin dashboard (US3).

**Auth**: Admin only.

**Input**:
```typescript
getPipelineCounts(dbInstance?: DB): Promise<PipelineCounts>

type PipelineCounts = {
  screening: number;
  technical_review: number;
  business_review: number;
  final_decision: number;
  awaiting_clarification: number;
}
```

**Implementation**: Single `GROUP BY status` query on `ideas` filtered to pipeline statuses.
