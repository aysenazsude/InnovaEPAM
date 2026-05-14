# Data Model: Blind Review (Anonymous Evaluation)

**Phase**: 1 — Design  
**Feature**: 006-blind-review  
**Date**: 2026-05-14

## Overview

Blind review is a **display-layer-only** change. No database schema migrations are required. No new tables or columns are added. The submitter's identity is preserved in all existing storage, and only the admin-facing rendering layer is modified.

---

## Existing Entities (unchanged in storage)

### `ideas` table (unchanged)

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | UUID |
| `submitter_id` | `text` FK → `users.id` | **Preserved in storage; never altered by this feature** |
| `title`, `description`, `category`, `status`, … | various | Unchanged |

The `submitterId` field in the `Idea` type remains present in all server-side data access and notification dispatch paths.

---

## New DTO (TypeScript only — no database change)

### `AdminIdeaView`

A TypeScript type used exclusively in admin-facing client components. It is `IdeaWithAttachments` with `submitterId` stripped.

```typescript
// src/lib/ideas/anonymize.ts

import type { IdeaWithAttachments } from '@/lib/actions/ideas';

/** Admin-facing view of an idea — submitterId is omitted to prevent identity leakage. */
export type AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'>;

/** Strips submitterId before data is passed to admin client components. */
export function toAdminIdeaView(idea: IdeaWithAttachments): AdminIdeaView {
  const { submitterId: _omit, ...rest } = idea;
  return rest;
}
```

**Properties**:
- Identical to `IdeaWithAttachments` in all fields except `submitterId`
- TypeScript enforces the omission at compile time — any admin client component that tries to access `.submitterId` will produce a type error
- Zero runtime overhead beyond the object spread

---

## New Constant

```typescript
// Addition to src/lib/constants.ts

export const ANONYMOUS_SUBMITTER_LABEL = 'Anonymous Submitter';
```

Used in every admin-facing render location where the submitter would otherwise be named.

---

## Data Flow

```
Database (submitterId preserved)
       │
       ▼
Server Action: getAdminIdeas() / getIdeaById()
       │  returns IdeaWithAttachments (submitterId present)
       ▼
Admin Server Component (e.g., admin/page.tsx, review/page.tsx)
       │  calls toAdminIdeaView() before passing to client components
       │  uses ANONYMOUS_SUBMITTER_LABEL for any rendered identity field
       ▼
Admin Client Component (e.g., AdminIdeaList)
       │  receives AdminIdeaView[] — submitterId absent from RSC payload
       ▼
Browser — no submitter identity in rendered HTML or serialized props
```

---

## Validation Rules

| Rule | Enforcement |
|---|---|
| Admin client components MUST NOT receive `submitterId` | TypeScript compile-time: `AdminIdeaView` type omits the field |
| Admin server components MUST NOT render `submitterId` or user name | Code review + unit test assertions |
| Submitter server-side data MUST remain unchanged | No migration; existing data access layer untouched |

---

## State Transitions (unchanged)

The idea status machine is not modified. Blind review has no effect on `submitted → under_review → accepted/rejected/screening → …` transitions.

---

## No Migrations Required

This feature requires zero database migrations. The existing `0000` through `0004` migration files are sufficient.
