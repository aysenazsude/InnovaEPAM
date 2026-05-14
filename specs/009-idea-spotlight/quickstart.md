# Quickstart: Idea Spotlight & News Section (Feature 009)

**Branch**: `009-idea-spotlight`  
**Date**: 2026-05-15

This guide gives an implementer everything needed to build Feature 009 from scratch.

---

## Prerequisites

- Feature 008 (Welcome Dashboard) fully implemented — `home/page.tsx` exists, `getDashboardData()` server action exists.
- Feature 007 (Scoring System) fully implemented — `evaluation_scores` table exists.
- On branch `009-idea-spotlight`.

---

## Step-by-Step Implementation Order

Follow this order to stay in the TDD RED-GREEN-REFACTOR cycle.

### Step 1 — DB Migration & Schema (no tests needed for raw SQL)

1. Create `src/lib/db/migrations/0006_spotlight_picks.sql` (see data-model.md for DDL).
2. Add `spotlightPicks` table definition to `src/lib/db/schema.ts` (see data-model.md for Drizzle code).
3. Export `SpotlightPick` and `NewSpotlightPick` types.
4. Run `npx drizzle-kit generate` then `npx drizzle-kit migrate` to apply locally.

### Step 2 — Server Action (TDD)

Write **integration tests first** in `tests/integration/spotlight/getSpotlightData.test.ts`:
- Test: returns null spotlight when no ideas this month
- Test: returns Score Pending spotlight when ideas exist but none scored
- Test: returns Top Rated spotlight with correct composite score
- Test: Editor's Pick overrides algorithmic spotlight
- Test: recently approved list is ordered by evaluatedAt DESC, limited to 5
- Test: hasMoreApproved is true when > 5 approved ideas exist
- Test: monthly activity counts are correct

Then implement `src/lib/actions/spotlight.ts`:
- `getSpotlightData(dbInstance?)` — see contracts/spotlight-api.md
- `pinEditorsPick(ideaId)` — admin-only server action
- `unpinEditorsPick()` — admin-only server action

Write **integration tests** for pin/unpin in `tests/integration/spotlight/pinEditorsPick.test.ts`:
- Test: pin sets spotlight for current month
- Test: pin replaces existing pick for same month
- Test: unpin removes current month pick
- Test: unpin is idempotent (no error if nothing to unpin)
- Test: non-admin cannot pin/unpin

### Step 3 — UI Components (TDD)

Write **unit tests first**, then implement each component.

#### `SpotlightCard`
- `tests/unit/components/dashboard/SpotlightCard.test.tsx`
- Tests: renders empty state when spotlight is null; renders "Top Rated" badge; renders "Editor's Pick" badge with gold style; renders "Score Pending" when compositeScore is null; shows pin button for admin; does not show pin button for non-admin.
- Implement `src/components/dashboard/SpotlightCard.tsx` (< 100 lines).

#### `RecentlyApprovedFeed`
- `tests/unit/components/dashboard/RecentlyApprovedFeed.test.tsx`
- Tests: renders empty state; renders up to 5 items; shows "View all" link when hasMore; does not show "View all" when hasMore is false.
- Implement `src/components/dashboard/RecentlyApprovedFeed.tsx`.

#### `MonthlyActivityStrip`
- `tests/unit/components/dashboard/MonthlyActivityStrip.test.tsx`
- Tests: renders all three counts; renders month label; zero counts render as "0" not blank.
- Implement `src/components/dashboard/MonthlyActivityStrip.tsx`.

### Step 4 — Home Page Integration

Update `src/app/(portal)/home/page.tsx`:
- Import `getSpotlightData` and call it alongside `getDashboardData`.
- Render `<SpotlightCard>`, `<RecentlyApprovedFeed>`, `<MonthlyActivityStrip>` below existing hero sections.
- Pass `isAdmin` from session role.

### Step 5 — Admin Pin/Unpin UI

Add inline pin/unpin form to `src/components/admin/AdminIdeaList.tsx`:
- For each idea card, render a small `<form action={pinEditorsPick.bind(null, idea.id)}>` button (if not currently pinned).
- If `idea.id === currentPickIdeaId`, render an "Unpin" button instead.
- Scope visibility to admin role (already admin-only page).

### Step 6 — E2E Tests

`tests/e2e/ideas/submitter-sees-spotlight.spec.ts`:
- Submitter logs in, navigates to `/home`, sees spotlight section (even if empty state).
- Submitter sees recently approved section.
- Submitter sees monthly activity strip.

`tests/e2e/admin/admin-pins-editors-pick.spec.ts`:
- Admin logs in, pins an idea as Editor's Pick from admin page.
- Admin navigates to `/home`, sees pinned idea as "Editor's Pick".
- Admin unpins; spotlight reverts (or shows empty state if no other ideas).

### Step 7 — Validation

```bash
npx tsc --noEmit              # Zero TypeScript errors
npm run lint                  # Zero ESLint warnings/errors
npm run test:unit             # All unit tests pass
npm run test:integration      # All integration tests pass
```

---

## Key Design Constraints

| Constraint | Detail |
|-----------|--------|
| No new npm packages | All new code uses existing dependencies only |
| No client-side state | All spotlight data is server-rendered; no `useState` or `useEffect` needed |
| File size limit | No file may exceed 300 lines (Principle I) |
| Dark theme | Use semantic tokens (`bg-card`, `border-border`, etc.) — no hardcoded colours |
| Server action auth | Every mutating server action must check `session?.user?.role === 'admin'` |
| SQLite epoch | `submittedAt` and `evaluatedAt` are Unix **milliseconds**; divide by 1000 before SQLite date functions |

---

## File Manifest

### New files

```
src/lib/db/migrations/0006_spotlight_picks.sql
src/lib/actions/spotlight.ts
src/components/dashboard/SpotlightCard.tsx
src/components/dashboard/RecentlyApprovedFeed.tsx
src/components/dashboard/MonthlyActivityStrip.tsx
tests/integration/spotlight/getSpotlightData.test.ts
tests/integration/spotlight/pinEditorsPick.test.ts
tests/unit/components/dashboard/SpotlightCard.test.tsx
tests/unit/components/dashboard/RecentlyApprovedFeed.test.tsx
tests/unit/components/dashboard/MonthlyActivityStrip.test.tsx
tests/e2e/ideas/submitter-sees-spotlight.spec.ts
tests/e2e/admin/admin-pins-editors-pick.spec.ts
```

### Modified files

```
src/lib/db/schema.ts                          # Add spotlightPicks table
src/app/(portal)/home/page.tsx                # Add spotlight sections
src/components/admin/AdminIdeaList.tsx        # Add pin/unpin actions
```

---

## Common Pitfalls

- **SQLite epoch**: Always divide `submittedAt / 1000` before passing to `datetime(..., 'unixepoch')`. Forgetting this will produce wrong month comparisons silently.
- **Month string**: Compute `currentMonth = new Date().toISOString().slice(0, 7)` in application code, not in SQL. This makes it injectable in tests via a parameter.
- **Category display name**: Join `ideaCategories` to resolve `slug → displayName`, or pass the slug and let the component resolve it client-side. Prefer server-side join to avoid an extra round trip.
- **Upsert pattern**: Drizzle's `.onConflictDoUpdate({ target: spotlightPicks.monthYear, set: { ... } })` handles the replace-existing-pick case.
- **revalidatePath**: Call on both `/home` and `/admin` after any pin/unpin so both pages reflect the change immediately.
