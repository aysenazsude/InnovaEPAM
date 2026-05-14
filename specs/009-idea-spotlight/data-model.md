# Data Model: Idea Spotlight & News Section

**Phase**: 1 — Design  
**Branch**: `009-idea-spotlight`  
**Date**: 2026-05-15

---

## New Entity: SpotlightPick

Represents an admin-designated "Editor's Pick" for a specific calendar month. At most one pick can exist per month (enforced by a `UNIQUE` constraint on `month_year`).

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `TEXT` | PRIMARY KEY | UUID v4 |
| `ideaId` | `TEXT` | NOT NULL, FK → `ideas.id` | The pinned idea |
| `monthYear` | `TEXT` | NOT NULL, UNIQUE | Format `'YYYY-MM'` (e.g. `'2026-05'`) |
| `pinnedAt` | `INTEGER` | NOT NULL | Unix milliseconds when the admin pinned the idea |
| `pinnedByAdminId` | `TEXT` | NOT NULL, FK → `users.id` | Admin who made the designation |

### Indexes

- `UNIQUE INDEX idx_spotlight_picks_month_year ON spotlight_picks(month_year)` — enforces one pick per month and enables efficient lookup by current month.
- `INDEX idx_spotlight_picks_idea_id ON spotlight_picks(idea_id)` — supports looking up whether an idea is currently pinned.

### Migration

New migration file: `0006_spotlight_picks.sql`

```sql
CREATE TABLE `spotlight_picks` (
  `id` text PRIMARY KEY NOT NULL,
  `idea_id` text NOT NULL REFERENCES `ideas`(`id`) ON DELETE CASCADE,
  `month_year` text NOT NULL,
  `pinned_at` integer NOT NULL,
  `pinned_by_admin_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_spotlight_picks_month_year` ON `spotlight_picks` (`month_year`);
--> statement-breakpoint
CREATE INDEX `idx_spotlight_picks_idea_id` ON `spotlight_picks` (`idea_id`);
```

### Drizzle Schema Addition (`src/lib/db/schema.ts`)

```typescript
export const spotlightPicks = sqliteTable(
  'spotlight_picks',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    monthYear: text('month_year').notNull(),
    pinnedAt: integer('pinned_at').notNull(),
    pinnedByAdminId: text('pinned_by_admin_id')
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    uniqueIndex('idx_spotlight_picks_month_year').on(table.monthYear),
    index('idx_spotlight_picks_idea_id').on(table.ideaId),
  ]
);

export type SpotlightPick = typeof spotlightPicks.$inferSelect;
export type NewSpotlightPick = typeof spotlightPicks.$inferInsert;
```

---

## Existing Entities Used (Read-Only)

### `ideas`

Fields consumed by this feature:
- `id`, `title`, `description`, `category`, `status`, `submitterId`, `submittedAt`, `evaluatedAt`

Queries added:
- Spotlight candidate lookup: filter by `submittedAt` in current month, join with `evaluation_scores` for composite score, order by score DESC, submittedAt DESC, limit 1.
- Recently approved: filter `status = 'approved'` AND `evaluatedAt IS NOT NULL`, order `evaluatedAt DESC`, limit 5.
- Monthly activity: aggregate counts scoped to current month via `submittedAt` (submitted, in-review) and `evaluatedAt` (approved).

### `users`

Fields consumed: `id`, `displayName`

Used to join onto the spotlight idea's `submitterId` to show the author's display name.

### `evaluation_scores`

Fields consumed: `ideaId`, `score`

Used to compute composite score: `AVG(score)` grouped by `ideaId`.

### `ideaCategories`

Fields consumed: `slug`, `displayName`

Used to resolve the category display name for the spotlight card and recently approved feed.

---

## Derived Data Structures (TypeScript)

These are computed at query time by the server action — they are NOT stored in the DB.

```typescript
// Spotlight card data (P1 + P4)
export interface SpotlightIdea {
  id: string;
  title: string;
  authorName: string;        // from users.displayName
  category: string;          // human-readable from ideaCategories.displayName
  compositeScore: number | null;  // null if no scores exist yet
  submittedAt: number;       // Unix ms
  label: 'Top Rated' | 'Editor\'s Pick' | 'Score Pending';
}

// One entry in the Recently Approved feed (P2)
export interface RecentlyApprovedIdea {
  id: string;
  title: string;
  category: string;          // human-readable
  evaluatedAt: number;       // Unix ms — used as "approval date"
}

// Monthly Activity Strip counts (P3)
export interface MonthlyActivity {
  submitted: number;
  inReview: number;
  approved: number;
  monthLabel: string;        // e.g. "May 2026" — computed from currentMonth
}

// Full payload returned by getSpotlightData()
export interface SpotlightPageData {
  spotlight: SpotlightIdea | null;
  recentlyApproved: RecentlyApprovedIdea[];
  hasMoreApproved: boolean;  // true when total approved > 5
  monthlyActivity: MonthlyActivity;
  currentPickIdeaId: string | null;  // for admin UI to know which idea is pinned
}
```

---

## State Transitions

### SpotlightPick lifecycle

```
[None for this month]
      │
      │ Admin pins idea X
      ▼
[Pinned: idea X, month = 'YYYY-MM']
      │
      │ Admin unpins  ──or──  Calendar month rolls over
      ▼
[None / algorithmic winner shown]
```

- Pinning uses `INSERT OR REPLACE` (Drizzle `onConflictDoUpdate`): replaces any existing pick for the same month.
- Unpinning deletes the row for the current month.
- Month rollover: no action required — old row simply doesn't match the new month's query.

---

## Validation Rules

| Rule | Where Enforced |
|------|---------------|
| `monthYear` format is exactly `'YYYY-MM'` | Server action (regex check before insert) |
| Only authenticated admins may call `pinEditorsPick` / `unpinEditorsPick` | Server action (auth check) |
| `ideaId` must reference an existing idea | DB foreign key + server action pre-check |
| At most one pick per month | DB UNIQUE constraint on `month_year` |
| `score` values in `evaluation_scores` are already validated by Feature 007 | No new validation needed |
