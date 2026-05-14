# API Contracts: Welcome Dashboard (Feature 008)

**Date**: 2026-05-15  
**Branch**: `008-welcome-dashboard`

---

## Server Action: `getDashboardData`

**File**: `src/lib/actions/dashboard.ts`  
**Auth**: Requires authenticated session (`role: 'submitter'`). Redirects to `/login` if unauthenticated. Admin callers should not reach this action (they use `/admin`).

### Signature

```typescript
export async function getDashboardData(
  dbInstance?: DB
): Promise<DashboardData>
```

### Return type

```typescript
export interface DashboardData {
  systemStats: SystemStats;
  userStats: UserStats;
  lastSubmission: LastSubmission | null;
}

export interface SystemStats {
  totalSubmitted: number;
  totalApproved: number;
  totalInPipeline: number;
}

export interface UserStats {
  totalSubmitted: number;
  totalApproved: number;
  totalPending: number;
}

export interface LastSubmission {
  id: string;
  title: string;
  status: string;
  submittedAt: number;
}
```

### Behaviour

- Executes two SQL queries in parallel (`Promise.all`).
- First query: aggregates counts across the whole `ideas` table for `systemStats`.
- Second query: aggregates counts and the latest row for the session user for `userStats` + `lastSubmission`.
- Returns zero-filled `SystemStats`/`UserStats` when no ideas exist (never throws on empty DB).
- `lastSubmission` is `null` when the user has no submitted ideas.

### Error handling

- Unauthenticated call → `redirect('/login')` (Next.js redirect, not a thrown error).
- DB error → propagates; Next.js error boundary catches it.

---

## Component Props Contracts

### `StatsRow`

```typescript
// src/components/dashboard/StatsRow.tsx
interface StatsRowProps {
  stats: SystemStats;
}
```

Renders three stat cards: "Total Ideas", "Approved", "In Pipeline".

### `UserStatsPanel`

```typescript
// src/components/dashboard/UserStatsPanel.tsx
interface UserStatsPanelProps {
  userStats: UserStats;
  lastSubmission: LastSubmission | null;
  userName: string;
}
```

Renders the personal stat section and the last submission card (or zero-state if `lastSubmission` is null).

### `QuickActions`

```typescript
// src/components/dashboard/QuickActions.tsx
interface QuickActionsProps {
  // No dynamic props — navigation links are static
}
```

Renders "Submit New Idea" primary button and "View All My Ideas" secondary link.

---

## Navigation Change

### `sessionManager.getRoleHome`

| Role | Before | After |
|---|---|---|
| `'submitter'` | `/ideas` | `/home` |
| `'admin'` | `/admin` | `/admin` (unchanged) |

This is the only post-login redirect change. All existing `/ideas` links remain valid — the Ideas page is not removed.

### Portal nav additions (submitter view)

| Link label | Destination | Position |
|---|---|---|
| Home | `/home` | First (before "My Ideas") |
| My Ideas | `/ideas` | Second (unchanged) |
| My Drafts | `/ideas/drafts` | Third (unchanged) |
