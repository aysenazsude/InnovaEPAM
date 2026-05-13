# Data Model: Smart Submission Forms — Phase 2

**Feature**: `002-smart-submission-forms`  
**Generated**: 2026-05-13  
**Depends on**: Phase 1 schema (`users`, `ideas`, `attachments`, `ideaCategories`)

---

## New Table: `idea_category_data`

One row per idea. Stores the submitted values for all category-specific fields as a JSON map. The core `ideas` table is **not modified**.

### Drizzle Schema Addition (`src/lib/db/schema.ts`)

```typescript
export const ideaCategoryData = sqliteTable('idea_category_data', {
  ideaId: text('idea_id')
    .primaryKey()
    .references(() => ideas.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  fields: text('fields', { mode: 'json' })
    .$type<Record<string, string | null>>()
    .notNull(),
  createdAt: integer('created_at').notNull(),
});

export type IdeaCategoryData    = typeof ideaCategoryData.$inferSelect;
export type NewIdeaCategoryData = typeof ideaCategoryData.$inferInsert;
```

### SQL (migration reference)

```sql
CREATE TABLE IF NOT EXISTS idea_category_data (
  idea_id    TEXT    NOT NULL PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  category   TEXT    NOT NULL,
  fields     TEXT    NOT NULL,   -- JSON object: { fieldName: value | null }
  created_at INTEGER NOT NULL
);
```

### Column Descriptions

| Column | Type | Constraints | Description |
|---|---|---|---|
| `idea_id` | TEXT | PK, FK → `ideas.id` CASCADE DELETE | One-to-one with the idea |
| `category` | TEXT | NOT NULL | The category slug at time of submission (e.g. `technical_innovation`) |
| `fields` | TEXT (JSON) | NOT NULL | Key→value map of submitted category-specific field values; unknown/unset fields are `null` |
| `created_at` | INTEGER | NOT NULL | Unix timestamp (seconds) matching the parent idea's `submitted_at` |

### `fields` JSON Examples

**Technical Innovation** (`category = 'technical_innovation'`):
```json
{
  "technology_area": "Backend",
  "estimated_effort": "Weeks"
}
```

**Process Improvement** (`category = 'process_improvement'`) — one field filled, one empty:
```json
{
  "affected_team": "Platform Engineering",
  "current_pain_point": null
}
```

**Other** — no category-specific fields; `fields` is an empty object:
```json
{}
```

---

## New Config Modules (no DB, pure TypeScript)

These are not entities in the DB sense — they are compile-time configuration modules that drive both the form rendering and server-side validation.

### `src/lib/ideas/categoryFieldConfig.ts`

```typescript
import { CategorySlug } from '@/lib/constants';

export type FieldType = 'text' | 'textarea' | 'select';

export interface FieldDefinition {
  name: string;                    // FormData key + fields JSON key
  label: string;
  type: FieldType;
  options?: readonly string[];     // select options only
  maxLength?: number;              // text + textarea only; select has no limit
  placeholder?: string;
}

export const CATEGORY_FIELDS: Record<CategorySlug, FieldDefinition[]> = {
  technical_innovation: [
    {
      name: 'technology_area',
      label: 'Technology Area',
      type: 'select',
      options: ['Frontend', 'Backend', 'Infrastructure', 'Data / AI', 'Security', 'Other'],
    },
    {
      name: 'estimated_effort',
      label: 'Estimated Effort',
      type: 'select',
      options: ['Days', 'Weeks', 'Months'],
    },
  ],
  process_improvement: [
    {
      name: 'affected_team',
      label: 'Affected Team / Department',
      type: 'text',
      maxLength: 100,
      placeholder: 'e.g. Platform Engineering',
    },
    {
      name: 'current_pain_point',
      label: 'Current Pain Point',
      type: 'textarea',
      maxLength: 500,
      placeholder: 'Describe the current inefficiency or blocker…',
    },
  ],
  client_solution: [
    {
      name: 'target_client_segment',
      label: 'Target Client Segment',
      type: 'text',
      maxLength: 100,
      placeholder: 'e.g. Financial Services',
    },
    {
      name: 'client_problem_statement',
      label: 'Client Problem Statement',
      type: 'textarea',
      maxLength: 500,
      placeholder: "Describe the client's challenge…",
    },
  ],
  product_enhancement: [
    {
      name: 'affected_product',
      label: 'Affected Product / Feature',
      type: 'text',
      maxLength: 100,
      placeholder: 'e.g. Reporting Dashboard',
    },
    {
      name: 'proposed_user_benefit',
      label: 'Proposed User Benefit',
      type: 'textarea',
      maxLength: 500,
      placeholder: 'Describe how this improves the user experience…',
    },
  ],
  other: [],
};
```

### `src/lib/ideas/categoryGuidanceConfig.ts`

```typescript
import { CategorySlug } from '@/lib/constants';

export const CATEGORY_GUIDANCE: Record<CategorySlug, string> = {
  technical_innovation:
    'Describe the technical problem this solves, the proposed approach, and the expected measurable improvement.',
  process_improvement:
    'Explain the current inefficiency, who is affected, and how this idea would improve the situation.',
  client_solution:
    "Describe the client's challenge clearly and explain how this idea addresses their pain point and the value it delivers.",
  product_enhancement:
    'Describe the current limitation and how this enhancement would improve the user experience or product capability.',
  other:
    'Please provide as much detail as possible to help evaluators understand and assess your idea.',
};
```

---

## Unchanged Phase 1 Tables

| Table | Change |
|---|---|
| `users` | None |
| `ideas` | None — no new columns |
| `attachments` | None |
| `idea_categories` | None — slugs match `CategorySlug` enum |

---

## Entity Relationships (Phase 2 additions in bold)

```
users ──< ideas >──── attachments
              │
              └──── **idea_category_data** (0..1 per idea)
```

- `idea_category_data.idea_id` → `ideas.id` (ON DELETE CASCADE)
- A row in `idea_category_data` is inserted at the same time as the parent `idea`; it is never updated after creation in Phase 2.
- An idea with `category = 'other'` MAY have a row with `fields = '{}'` or MAY have no row at all (both are valid; read queries MUST treat absence as no category data).

---

## Migration Plan

**New migration file**: `src/lib/db/migrations/0001_add_idea_category_data.sql`

Steps:
1. `drizzle-kit generate` — generates the SQL migration file from the updated schema.
2. `drizzle-kit migrate` (or `npm run db:migrate`) — applies the migration to the local dev DB.
3. No data backfill needed: existing `ideas` rows have no associated `idea_category_data`; the join returns `null`, which the admin detail view handles gracefully (no "Category Details" section rendered).
