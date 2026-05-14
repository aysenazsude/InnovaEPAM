# Research: Draft Management — Phase 4

**Branch**: `004-draft-management` | **Date**: 2026-05-14
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## R-001: Draft Persistence Layer — Separate Tables vs. Unified Ideas Table

**Decision**: Introduce two new SQLite tables via Drizzle ORM — `drafts` (all fields nullable) and `draft_attachments` — mirroring the `ideas` + `attachments` pattern.

**Rationale**:
- FR-004 requires that drafts MUST NOT appear in any idea listing. A shared table would require `status = 'draft'` filtering everywhere, creating a constant risk of leakage and polluting every existing idea query.
- Cascade-delete on draft removal is clean and explicit with dedicated tables.
- The schema is already partitioned by concept (`ideas`, `attachments`, `idea_category_data`); draft tables follow the same convention, keeping cognitive load low.

**Alternatives considered**:
- `status: 'draft'` column on `ideas` — rejected. Pollutes all idea queries, risks admin visibility of drafts, violates FR-004 and FR-023 with any missed filter.
- `localStorage` / `sessionStorage` — rejected. Violates A-001 (drafts must be server-side and cross-device).

---

## R-002: Draft Attachment File Storage

**Decision**: Draft attachments share the same `data/uploads/` filesystem directory as idea attachments. The `draft_attachments` table stores the same columns as `attachments` but references `drafts.id` instead of `ideas.id`. On draft submission (promotion to idea), attachment records are moved by INSERT into `attachments` + DELETE from `draft_attachments` in the same transaction; the on-disk file is not copied or moved.

**Rationale**:
- Avoids double-writing large files. The storage path (UUID filename) remains stable; only the DB pointer changes.
- Consistent with the existing `saveFile` / `deleteFile` abstraction in `src/lib/storage.ts`.
- When a draft is deleted, `deleteFile` is called for each `draft_attachments` record, then the row is deleted — identical to the existing idea attachment deletion flow.

**Alternatives considered**:
- Separate `data/uploads/drafts/` subdirectory — adds path complexity without benefit; the UUID filename already guarantees uniqueness across both buckets.
- Re-upload files on submission — rejected. Wasteful for large files; breaks the UX promise that submission is instant.

---

## R-003: Concurrent Edit Conflict Detection

**Decision**: Add an integer `version` column to the `drafts` table (default 1, increments on every save). The client receives the current `version` when it loads a draft. On save, the server action accepts `version` and runs:

```sql
UPDATE drafts SET ..., version = version + 1
WHERE id = ? AND version = ?
```

If 0 rows are updated (version mismatch), the action returns `{ conflict: true }`. The UI shows a warning: "This draft was saved from another tab or device. Refresh to load the latest version."

**Rationale**:
- SQLite's single-writer model makes true concurrent conflicts rare, but the spec edge case requires them to be handled. A version column is the minimal, correct solution.
- No extra dependencies needed; standard optimistic-concurrency pattern.

**Alternatives considered**:
- Last-write-wins silently — rejected. Spec explicitly requires a warning.
- Full CRDT field-level merge — rejected. Over-engineered for the portal's expected low-concurrency usage.

---

## R-004: IdeaForm Reuse for Draft Editing

**Decision**: Add two optional props to the existing `IdeaForm` component:
- `draftId?: string` — when present, activates draft mode
- `defaultValues?: DraftFormValues` — pre-fills all fields (title, description, category, categoryFields, attachments) from the loaded draft

Behaviour changes in draft mode:
- A **"Save Draft"** button is added alongside the existing "Submit" button
- "Save Draft" calls `saveDraft(draftId | null, formData)` — creates if null, updates if set
- "Submit" calls `submitDraftAsIdea(draftId, formData)` instead of `submitIdea(formData)`

**Rationale**:
- A-006 explicitly requires reusing the submission form, not introducing a new one.
- Avoids duplicating `IdeaForm`'s complex state (Phase 2 category fields, Phase 3 file upload). Controlled via props — no internal conditionals bleed outward.
- `FileUpload` already handles pre-loaded attachment metadata via `initialFiles` prop (Phase 3 implementation). Draft resume just passes the saved attachments as `initialFiles`.

**Alternatives considered**:
- Separate `DraftForm` component — rejected. Would duplicate ~80% of IdeaForm, violating Principle I (Clean Code) and the 300-line file limit.

---

## R-005: Draft Limit Enforcement (10 per user)

**Decision**: Enforce the 10-draft maximum inside the `saveDraft` server action, inside a transaction:
1. `SELECT COUNT(*) FROM drafts WHERE submitter_id = ?` — if creating new draft and count ≥ 10, return `{ limitReached: true }`.
2. Client disables "Save Draft" when the API has indicated the limit is reached (fetched on drafts list load).

**Rationale**:
- Defense in depth: client UI disables the button but server always re-validates (spec FR-006).
- Transaction ensures the count and insert are atomic — no race condition between two concurrent saves.

---

## R-006: Draft-to-Idea Promotion Atomicity

**Decision**: Wrap draft submission in a single Drizzle transaction performing these steps in order:
1. INSERT into `ideas`
2. INSERT into `idea_category_data` (if category fields exist)
3. INSERT all `draft_attachments` rows into `attachments` (file data unchanged on disk)
4. DELETE from `draft_attachments` WHERE `draft_id = ?`
5. DELETE from `drafts` WHERE `id = ?`

If any step throws, the entire transaction rolls back. The draft and its files survive intact.

**Rationale**:
- Prevents the ghost-draft problem (draft deleted but idea not created) and the duplicate-idea problem (idea created but draft not cleaned up).
- Consistent with Phase 3's multi-file submission which already uses Drizzle transactions.
- FR-018 requires the draft to survive intact on submission failure.

---

## R-007: Drafts List Route & Navigation

**Decision**: Add a new route `src/app/(portal)/ideas/drafts/page.tsx` and a new `DraftList` component at `src/components/ideas/DraftList.tsx`. Navigation entry point: a "My Drafts" link in the portal ideas section (alongside the existing ideas list).

Resuming a draft navigates to `/ideas/new?draftId={id}`. The `new/page.tsx` reads the optional `draftId` query param, fetches the draft server-side, and passes `defaultValues` + `draftId` to `IdeaForm`.

**Rationale**:
- Keeps routing consistent with the existing App Router pattern.
- Server-side draft fetch on the page prevents a client-side loading flash.
- Reusing `/ideas/new` for resume is consistent with A-006 and avoids a second form route.

---

## Summary of Resolved Decisions

| ID | Decision |
|----|----------|
| R-001 | Two new tables: `drafts` + `draft_attachments` |
| R-002 | Shared `data/uploads/` storage; file moves are DB-only on submission |
| R-003 | Optimistic `version` column for concurrent-edit detection |
| R-004 | Extend `IdeaForm` with `draftId` + `defaultValues` props |
| R-005 | Count-check in transaction; client disables button proactively |
| R-006 | Single Drizzle transaction for atomic draft-to-idea promotion |
| R-007 | `/ideas/drafts` list page; `/ideas/new?draftId=` for resume |
