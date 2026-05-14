# API Contract: Spotlight & News Server Actions

**Module**: `src/lib/actions/spotlight.ts`  
**Pattern**: Next.js Server Actions (`'use server'`)  
**Auth**: All actions require an active session. Read actions (`getSpotlightData`) are available to any authenticated role. Write actions (`pinEditorsPick`, `unpinEditorsPick`) require `role === 'admin'`.

---

## `getSpotlightData(dbInstance?: DB): Promise<SpotlightPageData>`

Fetches all data needed to render the spotlight and news sections on the home dashboard. Called server-side from the `/home` RSC page.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dbInstance` | `DB` | No | Injected DB instance for testing. Defaults to the global `db` singleton. |

### Return Type

```typescript
interface SpotlightIdea {
  id: string;
  title: string;
  authorName: string;
  category: string;
  compositeScore: number | null;
  submittedAt: number;             // Unix ms
  label: 'Top Rated' | "Editor's Pick" | 'Score Pending';
}

interface RecentlyApprovedIdea {
  id: string;
  title: string;
  category: string;
  evaluatedAt: number;             // Unix ms
}

interface MonthlyActivity {
  submitted: number;
  inReview: number;
  approved: number;
  monthLabel: string;              // e.g. "May 2026"
}

interface SpotlightPageData {
  spotlight: SpotlightIdea | null;
  recentlyApproved: RecentlyApprovedIdea[];
  hasMoreApproved: boolean;
  monthlyActivity: MonthlyActivity;
  currentPickIdeaId: string | null;
}
```

### Behaviour

1. Authenticates the session; calls `redirect('/login')` if no session.
2. Executes three parallel queries via `Promise.all`:
   - **Spotlight query**: See resolution algorithm below.
   - **Recently approved query**: `SELECT id, title, category, evaluated_at FROM ideas WHERE status = 'approved' AND evaluated_at IS NOT NULL ORDER BY evaluated_at DESC LIMIT 6` (6 to detect `hasMoreApproved`).
   - **Monthly activity query**: Three `COUNT(*)` aggregates scoped to current month.
3. Returns assembled `SpotlightPageData`.

### Spotlight Resolution Algorithm (sequential, stops at first match)

```
currentMonth ← new Date().toISOString().slice(0, 7)   // 'YYYY-MM'

Step 1 — Editor's Pick:
  SELECT sp.idea_id, i.title, u.display_name, i.category, i.submitted_at,
         AVG(es.score) as composite_score
  FROM spotlight_picks sp
  JOIN ideas i ON sp.idea_id = i.id
  JOIN users u ON i.submitter_id = u.id
  LEFT JOIN evaluation_scores es ON es.idea_id = i.id
  WHERE sp.month_year = currentMonth
  GROUP BY sp.idea_id
  LIMIT 1
  → if found: label = "Editor's Pick", return

Step 2 — Highest-scored idea this month:
  SELECT i.id, i.title, u.display_name, i.category, i.submitted_at,
         AVG(es.score) as composite_score
  FROM ideas i
  JOIN users u ON i.submitter_id = u.id
  JOIN evaluation_scores es ON es.idea_id = i.id
  WHERE strftime('%Y-%m', datetime(i.submitted_at / 1000, 'unixepoch')) = currentMonth
  GROUP BY i.id
  ORDER BY composite_score DESC, i.submitted_at DESC
  LIMIT 1
  → if found: label = "Top Rated", return

Step 3 — Most recent unscored idea this month:
  SELECT i.id, i.title, u.display_name, i.category, i.submitted_at
  FROM ideas i
  JOIN users u ON i.submitter_id = u.id
  WHERE strftime('%Y-%m', datetime(i.submitted_at / 1000, 'unixepoch')) = currentMonth
  ORDER BY i.submitted_at DESC
  LIMIT 1
  → if found: label = "Score Pending", compositeScore = null, return

Step 4 — No ideas this month:
  return null
```

### Error Behaviour

| Condition | Response |
|-----------|----------|
| No session | `redirect('/login')` |
| DB query error | Propagates as 500; Next.js error boundary handles it |

---

## `pinEditorsPick(ideaId: string): Promise<{ success: boolean; error?: string }>`

Designates an idea as the Editor's Pick for the current calendar month. Replaces any existing pick for the current month.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ideaId` | `string` | Yes | UUID of the idea to pin |

### Return Type

```typescript
{ success: true } | { success: false; error: string }
```

### Behaviour

1. Authenticates session; returns `{ success: false, error: 'Unauthorized' }` if no session or `role !== 'admin'`.
2. Validates `ideaId` is a non-empty string.
3. Verifies idea exists in DB; returns `{ success: false, error: 'Idea not found' }` otherwise.
4. Computes `currentMonth = new Date().toISOString().slice(0, 7)`.
5. Upserts into `spotlight_picks`:
   - `id` = new UUID v4
   - `ideaId` = param
   - `monthYear` = currentMonth
   - `pinnedAt` = `Date.now()`
   - `pinnedByAdminId` = session user id
   - On conflict (`month_year`): update `idea_id`, `pinned_at`, `pinned_by_admin_id`
6. Calls `revalidatePath('/home')` and `revalidatePath('/admin')`.
7. Returns `{ success: true }`.

### Error Behaviour

| Condition | Response |
|-----------|----------|
| Not authenticated | `{ success: false, error: 'Unauthorized' }` |
| Role is not admin | `{ success: false, error: 'Unauthorized' }` |
| Idea not found | `{ success: false, error: 'Idea not found' }` |
| DB error | `{ success: false, error: 'Failed to pin idea' }` |

---

## `unpinEditorsPick(): Promise<{ success: boolean; error?: string }>`

Clears the Editor's Pick for the current calendar month, reverting the spotlight to the algorithmic selection.

### Parameters

None.

### Return Type

```typescript
{ success: true } | { success: false; error: string }
```

### Behaviour

1. Authenticates session; returns `{ success: false, error: 'Unauthorized' }` if no session or `role !== 'admin'`.
2. Computes `currentMonth = new Date().toISOString().slice(0, 7)`.
3. Deletes from `spotlight_picks` where `month_year = currentMonth`.
4. Calls `revalidatePath('/home')` and `revalidatePath('/admin')`.
5. Returns `{ success: true }` (idempotent — succeeds even if no pick existed).

### Error Behaviour

| Condition | Response |
|-----------|----------|
| Not authenticated | `{ success: false, error: 'Unauthorized' }` |
| Role is not admin | `{ success: false, error: 'Unauthorized' }` |
| DB error | `{ success: false, error: 'Failed to unpin' }` |

---

## UI Component Interfaces

### `<SpotlightCard spotlight={SpotlightIdea | null} isAdmin={boolean} currentPickIdeaId={string | null} />`

- If `spotlight` is null: renders empty state ("No spotlight yet this month — submit your best idea!").
- If `spotlight.label === "Editor's Pick"`: renders gold "Editor's Pick" badge.
- If `isAdmin === true`: renders inline pin/unpin form actions.
- `compositeScore` shown as `"X.X / 5"` or `"Score Pending"` if null.

### `<RecentlyApprovedFeed ideas={RecentlyApprovedIdea[]} hasMore={boolean} />`

- Renders up to 5 items; if `hasMore`, renders "View all approved ideas" link to `/ideas?status=approved`.
- If `ideas.length === 0`: renders "The first approved idea will appear here."

### `<MonthlyActivityStrip activity={MonthlyActivity} />`

- Three inline counters: submitted / in review / approved.
- Header shows `activity.monthLabel` (e.g. "May 2026").
