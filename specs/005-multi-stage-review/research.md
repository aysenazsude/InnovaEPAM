# Research: Multi-Stage Review — Phase 5

## R-001: Backward Compatibility With Existing IdeaStatus Enum

**Decision**: Extend the `ideas.status` column enum with new pipeline stages; preserve all existing values.

**Rationale**: The existing `status` column drives filtering, UI display, and integration tests. Removing or renaming values (`submitted`, `under_review`, `accepted`, `rejected`) would break all existing queries and UI branches. By extending the enum in-place, pre-pipeline ideas (Phases 1–4) remain untouched and continue to display correctly.

**Approach**:
- New status values: `screening`, `technical_review`, `business_review`, `final_decision`, `approved`, `awaiting_clarification`
- `submitted` → `screening` is the first pipeline transition (replaces `submitted` → `under_review` for new ideas)
- `approved` is the terminal success state for pipeline ideas (parallel to `accepted` for Phase 1 ideas)
- `awaiting_clarification` is a transient state that carries a foreign key to the active `clarificationRequests` row
- Old `under_review`, `accepted`, `rejected` remain valid — admins continue to see Phase 1 ideas correctly
- A parallel `pipelineMachine.ts` module handles the new transitions; the existing `statusMachine.ts` is left untouched

**Alternatives considered**:
- Adding a separate `pipelineStage` column — rejected because it creates two sources of truth for idea state and complicates queries
- Replacing the enum with the new values — rejected because it breaks existing code and data without a complex migration

---

## R-002: Optimistic Concurrency for Stage Transitions (FR-015 — Single Reviewer, First-Write-Wins)

**Decision**: Use the idea's current `status` value as an optimistic version token inside a database transaction.

**Rationale**: SQLite is serialised for writes, so a SELECT + UPDATE inside a transaction gives us read-then-write atomicity. The client sends `expectedStatus` in the form payload; the action reads the actual `status` in a transaction, compares, and rejects with a conflict error if they differ. This is the same pattern used for draft version checks in Phase 4 and requires no additional columns.

**Approach**:
1. Admin loads idea detail → current `status` embedded as a hidden input (e.g., `screening`)
2. On advance action: `dbInstance.transaction(tx => { const [idea] = tx.select(); if (idea.status !== expectedStatus) return { conflict: true }; tx.update(status = 'technical_review'); tx.insert(stageTransitions); })`
3. Second admin who submits simultaneously gets `{ conflict: true }` — UI shows "This idea has already been moved by another reviewer"

**Alternatives considered**:
- A dedicated `version` integer column on `ideas` — rejected as unnecessary given SQLite serialised writes and the `status` field serving the same purpose
- Pessimistic locking — not available in SQLite; not needed given low concurrency

---

## R-003: Stage Transitions Audit Table Schema

**Decision**: Dedicated `stageTransitions` table — append-only event log for every pipeline action.

**Rationale**: Storing audit data on the `ideas` row (e.g., adding `stage1Notes`, `stage2Notes` columns) would couple the schema to exactly 4 stages and prevent querying history. An event-log table is infinitely extensible and naturally supports the spec requirement (FR-006) for a full audit trail including actor, timestamp, action, and notes.

**Schema**:
```sql
stage_transitions (
  id            TEXT PRIMARY KEY,
  idea_id       TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  stage         TEXT NOT NULL,   -- 'screening' | 'technical_review' | 'business_review' | 'final_decision'
  action        TEXT NOT NULL,   -- 'advanced' | 'rejected' | 'approved' | 'awaiting_clarification' | 'clarification_cancelled' | 'clarification_resolved'
  notes         TEXT NOT NULL,
  admin_id      TEXT NOT NULL REFERENCES users(id),
  created_at    INTEGER NOT NULL
)
INDEX: (idea_id, created_at DESC)
```

**Alternatives considered**:
- Storing notes in `ideas` columns (e.g., `screeningNotes`) — rejected because it doesn't scale beyond 4 stages and prevents querying history
- JSON blob on `ideas` — rejected because it prevents indexed queries on stage/action

---

## R-004: Clarification Request Data Model (US4 + Q1:A Admin Cancel)

**Decision**: Separate `clarificationRequests` table with nullable `response`, `cancelledAt`, and `cancelledById` columns to support both the submitter-responds and admin-cancels resolution paths.

**Schema**:
```sql
clarification_requests (
  id                   TEXT PRIMARY KEY,
  idea_id              TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  stage_when_requested TEXT NOT NULL,   -- stage the idea was at when clarification was requested
  question             TEXT NOT NULL,
  questioner_id        TEXT NOT NULL REFERENCES users(id),
  requested_at         INTEGER NOT NULL,
  response             TEXT,            -- NULL until submitter responds
  responder_id         TEXT REFERENCES users(id),
  responded_at         INTEGER,
  cancelled_at         INTEGER,         -- NULL unless admin cancelled (Q1:A path)
  cancelled_by_id      TEXT REFERENCES users(id)
)
INDEX: (idea_id)
```

The idea status reverts to `stageWhenRequested` when either `response` is submitted or when the admin cancels. A `resolvedAt` computed field is `COALESCE(responded_at, cancelled_at)`.

---

## R-005: Pipeline Summary Counts for Admin Dashboard (US3)

**Decision**: Simple `GROUP BY status` query on the `ideas` table, returned as a `{ [stage]: number }` map from a server action.

**Rationale**: SQLite handles this in a single scan. No materialised view or denormalised counter needed at expected idea volumes (hundreds to low thousands). The count refreshes on page load, consistent with the portal's server-component rendering pattern.

**Query shape**:
```sql
SELECT status, COUNT(*) as count
FROM ideas
WHERE status IN ('screening', 'technical_review', 'business_review', 'final_decision', 'awaiting_clarification')
GROUP BY status
```

---

## R-006: How the Existing Evaluation Actions and Phase 1 Ideas Are Affected

**Decision**: Leave `statusMachine.ts`, `evaluation.ts` (acceptIdea, rejectIdea, transitionToUnderReview), and all Phase 1 tests completely untouched. Phase 5 introduces a parallel pipeline via new files.

**Rationale**: Phase 1 ideas with `status = under_review | accepted | rejected` must continue to work. The admin dashboard will show a toggle or tab to separate "Pipeline Ideas" (Phase 5) from "Classic Ideas" (Phase 1). Both share the same `ideas` table.

**New files (no changes to existing)**:
- `src/lib/ideas/pipelineMachine.ts` — new state machine for 4-stage transitions
- `src/lib/actions/pipeline.ts` — new server actions (advanceStage, rejectAtStage, requestClarification, cancelClarification, respondToClarification, approveFinalDecision)
- `src/lib/pipeline/pipelineRepository.ts` — Drizzle queries for stage transitions and clarification requests
- `src/components/admin/PipelineForm.tsx` — stage-advance form (replaces EvaluationForm for pipeline ideas)
- `src/components/ideas/PipelineProgress.tsx` — progress bar for submitter view
