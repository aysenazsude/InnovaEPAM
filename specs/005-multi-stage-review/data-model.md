# Data Model: Multi-Stage Review — Phase 5

## Entity Overview

Phase 5 introduces two new tables (`stage_transitions`, `clarification_requests`) and extends the `ideas` table with new enum values and a `activeClarificationId` foreign key. Existing tables are not modified beyond the schema extension.

---

## Extended `ideas` Table

The `status` column enum is extended with new values. All existing rows and code remain valid.

| Column | Type | Change | Notes |
|--------|------|--------|-------|
| `status` | TEXT enum | **Extended** | New values: `screening`, `technical_review`, `business_review`, `final_decision`, `approved`, `awaiting_clarification` |
| `active_clarification_id` | TEXT FK | **New** | Points to the open `clarification_requests.id`; NULL when no clarification is pending |

**Extended enum values** (all existing values preserved):
```
'submitted' | 'under_review' | 'accepted' | 'rejected'   ← Phase 1 (unchanged)
'screening' | 'technical_review' | 'business_review' | 'final_decision' | 'approved' | 'awaiting_clarification'  ← Phase 5
```

**Pipeline entry point**: A submitted idea enters the pipeline when an admin explicitly starts the review. Status transitions: `submitted → screening` (replacing the Phase 1 `submitted → under_review` path for pipeline ideas).

---

## New Table: `stage_transitions`

Append-only event log. One row per pipeline action taken by an admin.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID |
| `idea_id` | TEXT | NOT NULL, FK → `ideas.id` ON DELETE CASCADE | The idea this transition belongs to |
| `stage` | TEXT | NOT NULL | Stage at which this action was taken: `screening` \| `technical_review` \| `business_review` \| `final_decision` |
| `action` | TEXT | NOT NULL | `advanced` \| `rejected` \| `approved` \| `awaiting_clarification` \| `clarification_cancelled` \| `clarification_resolved` |
| `notes` | TEXT | NOT NULL | Mandatory reviewer notes (min 1 character) |
| `admin_id` | TEXT | NOT NULL, FK → `users.id` | Reviewer who performed this action |
| `created_at` | INTEGER | NOT NULL | Unix epoch seconds |

**Indexes**:
- `idx_stage_transitions_idea_id` on `(idea_id)` — fetch all transitions for an idea
- `idx_stage_transitions_idea_created` on `(idea_id, created_at DESC)` — ordered history queries

**Validation rules**:
- `notes`: required, minimum 1 character, maximum 2000 characters
- `stage`: must be one of the 4 defined stage values
- `action`: must be one of the 6 defined action values

---

## New Table: `clarification_requests`

One row per clarification request. Supports both submitter-responds and admin-cancels resolution paths (Q1:A decision).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID |
| `idea_id` | TEXT | NOT NULL, FK → `ideas.id` ON DELETE CASCADE | The idea this request belongs to |
| `stage_when_requested` | TEXT | NOT NULL | Pipeline stage at the moment the request was made |
| `question` | TEXT | NOT NULL | Admin's question for the submitter |
| `questioner_id` | TEXT | NOT NULL, FK → `users.id` | Admin who created this request |
| `requested_at` | INTEGER | NOT NULL | Unix epoch seconds |
| `response` | TEXT | nullable | Submitter's response text; NULL until submitter responds |
| `responder_id` | TEXT | nullable, FK → `users.id` | Submitter who responded; NULL until resolved |
| `responded_at` | INTEGER | nullable | When the submitter responded; NULL until resolved |
| `cancelled_at` | INTEGER | nullable | When admin cancelled this request; NULL unless admin-cancelled |
| `cancelled_by_id` | TEXT | nullable, FK → `users.id` | Admin who cancelled; NULL unless cancelled |

**Indexes**:
- `idx_clarification_requests_idea_id` on `(idea_id)` — fetch requests for an idea

**State machine**:
- `Pending`: `response IS NULL AND cancelled_at IS NULL` — idea is at `awaiting_clarification`
- `Resolved by submitter`: `response IS NOT NULL AND cancelled_at IS NULL` — idea returns to `stage_when_requested`
- `Cancelled by admin`: `cancelled_at IS NOT NULL` — idea returns to `stage_when_requested`

**Validation rules**:
- `question`: required, max 1000 characters
- `response`: required when submitting (min 1 char, max 2000 chars)

---

## Pipeline State Machine

```
submitted
    │  (admin starts pipeline review)
    ▼
screening ◄─────── awaiting_clarification ─────► (resolved/cancelled → returns here)
    │  (advance with notes)
    ▼
technical_review ◄─ awaiting_clarification ──────► (resolved/cancelled → returns here)
    │  (advance with notes)
    ▼
business_review ◄── awaiting_clarification ──────► (resolved/cancelled → returns here)
    │  (advance with notes)
    ▼
final_decision ◄─── awaiting_clarification ──────► (resolved/cancelled → returns here)
    │  (approve/reject with notes)
    ▼
approved | rejected

At any stage (screening → final_decision):
    │  (reject with notes)
    ▼
rejected  ← terminal state
```

**Valid transitions** (implemented in `pipelineMachine.ts`):
| From | Action | To |
|------|--------|----|
| `submitted` | start pipeline | `screening` |
| `screening` | advance | `technical_review` |
| `technical_review` | advance | `business_review` |
| `business_review` | advance | `final_decision` |
| `final_decision` | approve | `approved` |
| `screening` \| `technical_review` \| `business_review` \| `final_decision` | reject | `rejected` |
| `screening` \| `technical_review` \| `business_review` \| `final_decision` | request clarification | `awaiting_clarification` |
| `awaiting_clarification` | respond / cancel | back to `stage_when_requested` |

---

## TypeScript Types

```typescript
// New status values added to the existing IdeaStatus union
export type PipelineStage = 'screening' | 'technical_review' | 'business_review' | 'final_decision';

export type PipelineAction = 'advanced' | 'rejected' | 'approved' | 'awaiting_clarification' | 'clarification_cancelled' | 'clarification_resolved';

export type StageTransition = typeof stageTransitions.$inferSelect;
export type NewStageTransition = typeof stageTransitions.$inferInsert;
export type ClarificationRequest = typeof clarificationRequests.$inferSelect;
export type NewClarificationRequest = typeof clarificationRequests.$inferInsert;
```

---

## Drizzle Schema Additions

```typescript
// Extended IdeaStatus (add to existing type)
export type IdeaStatus =
  | 'submitted' | 'under_review' | 'accepted' | 'rejected'       // Phase 1 (unchanged)
  | 'screening' | 'technical_review' | 'business_review'          // Phase 5 pipeline stages
  | 'final_decision' | 'approved' | 'awaiting_clarification';     // Phase 5 terminal + transient

export const stageTransitions = sqliteTable(
  'stage_transitions',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id').notNull().references(() => ideas.id, { onDelete: 'cascade' }),
    stage: text('stage', { enum: ['screening', 'technical_review', 'business_review', 'final_decision'] }).notNull(),
    action: text('action', { enum: ['advanced', 'rejected', 'approved', 'awaiting_clarification', 'clarification_cancelled', 'clarification_resolved'] }).notNull(),
    notes: text('notes').notNull(),
    adminId: text('admin_id').notNull().references(() => users.id),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_stage_transitions_idea_id').on(table.ideaId),
    index('idx_stage_transitions_idea_created').on(sql`${table.ideaId}, ${table.createdAt} DESC`),
  ]
);

export const clarificationRequests = sqliteTable(
  'clarification_requests',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id').notNull().references(() => ideas.id, { onDelete: 'cascade' }),
    stageWhenRequested: text('stage_when_requested').notNull(),
    question: text('question').notNull(),
    questionerId: text('questioner_id').notNull().references(() => users.id),
    requestedAt: integer('requested_at').notNull(),
    response: text('response'),
    responderId: text('responder_id').references(() => users.id),
    respondedAt: integer('responded_at'),
    cancelledAt: integer('cancelled_at'),
    cancelledById: text('cancelled_by_id').references(() => users.id),
  },
  (table) => [index('idx_clarification_requests_idea_id').on(table.ideaId)]
);
```
