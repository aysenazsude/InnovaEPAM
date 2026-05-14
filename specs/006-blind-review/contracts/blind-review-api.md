# Interface Contract: Blind Review — Admin Idea View

**Feature**: 006-blind-review  
**Date**: 2026-05-14  
**Type**: TypeScript DTO contract (no HTTP API changes)

## Overview

Blind review does not introduce new HTTP API endpoints. The contract change is a TypeScript type boundary enforced at the server-component → client-component data handoff.

---

## `AdminIdeaView` Type Contract

**Module**: `src/lib/ideas/anonymize.ts`  
**Exported from**: same file  
**Used by**: all admin-facing client components that receive idea data

```typescript
/**
 * Admin-facing view of a submitted idea.
 * submitterId is intentionally absent to enforce blind review at compile time.
 */
type AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'>;
```

### Fields present in `AdminIdeaView`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Idea UUID — used for routing, not submitter identity |
| `numericId` | `number` | Human-readable idea number |
| `title` | `string` | Idea title |
| `description` | `string` | Idea description |
| `category` | `string` | Category slug |
| `status` | `IdeaStatus` | Current status |
| `submittedAt` | `number` | Unix timestamp |
| `adminComment` | `string \| null` | Admin feedback |
| `evaluatingAdminId` | `string \| null` | Admin ID (not submitter) |
| `activeClarificationId` | `string \| null` | Clarification ref |
| `attachments` | `Attachment[]` | File attachments |
| `categoryData` | `IdeaCategoryData \| null` | Category-specific fields |

### Fields absent from `AdminIdeaView`

| Field | Reason omitted |
|---|---|
| `submitterId` | Blind review: must not be accessible in admin client components |

---

## `toAdminIdeaView()` Function Contract

**Module**: `src/lib/ideas/anonymize.ts`

```typescript
function toAdminIdeaView(idea: IdeaWithAttachments): AdminIdeaView
```

**Signature**: Pure function, no side effects, no async, no throws.  
**Input**: Any valid `IdeaWithAttachments` (including null-checked).  
**Output**: The same object minus the `submitterId` field.  
**Idempotent**: Yes — calling twice on the same idea produces the same result.

### Usage Contract

Server components in `src/app/(portal)/admin/**` MUST call `toAdminIdeaView()` (or `ideas.map(toAdminIdeaView)`) before passing idea data to any `'use client'` component.

```typescript
// ✅ CORRECT — strips submitterId before client boundary
const adminViews = ideas.map(toAdminIdeaView);
<AdminIdeaList ideas={adminViews} />

// ❌ INCORRECT — exposes submitterId in RSC payload
<AdminIdeaList ideas={ideas} />
```

---

## `AdminIdeaList` Component Props Contract (updated)

**Module**: `src/components/admin/AdminIdeaList.tsx`

| Prop | Previous Type | New Type | Change |
|---|---|---|---|
| `ideas` | `IdeaWithAttachments[]` | `AdminIdeaView[]` | `submitterId` removed from each element |
| `pipelineCounts` | `PipelineCounts \| undefined` | unchanged | — |
| `staleClarificationIdeaIds` | `Set<string> \| undefined` | unchanged | — |

---

## Rendering Contract: `ANONYMOUS_SUBMITTER_LABEL`

**Module**: `src/lib/constants.ts`

```typescript
export const ANONYMOUS_SUBMITTER_LABEL = 'Anonymous Submitter';
```

Any admin server component that previously rendered the submitter's name or ID MUST now render `ANONYMOUS_SUBMITTER_LABEL` in its place. This applies to:

| File | Previous render | Required render |
|---|---|---|
| `src/app/(portal)/admin/ideas/[id]/review/page.tsx` | `{idea.submitterId}` | `{ANONYMOUS_SUBMITTER_LABEL}` |

---

## Unchanged Contracts

The following contracts are **explicitly not changed** by blind review:

- `getAdminIdeas()` server action — still returns `IdeaWithAttachments[]` with `submitterId` for server-side use
- `getIdeaById()` server action — still returns `IdeaWithAttachments | null` with `submitterId` for server-side use
- All evaluation and pipeline server actions (`acceptIdea`, `rejectIdea`, `advanceStage`, etc.) — receive `ideaId`, not submitter data; unchanged
- Notification dispatch paths — server-side only; use `submitterId` to look up the recipient; unchanged
- Submitter-facing views (`src/app/(portal)/ideas/**`) — show submitter their own name; unchanged
