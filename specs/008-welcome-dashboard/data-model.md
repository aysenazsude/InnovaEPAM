# Data Model: Welcome Dashboard (Feature 008)

**Date**: 2026-05-15  
**Branch**: `008-welcome-dashboard`

> No new database tables or migrations are required. All statistics are computed from the existing `ideas` table.

---

## TypeScript Types

### `SystemStats`
Aggregated portal-wide statistics, computed at page-load time.

```typescript
// src/lib/actions/dashboard.ts

export interface SystemStats {
  totalSubmitted: number;   // All ideas regardless of status
  totalApproved: number;    // status = 'approved'
  totalInPipeline: number;  // status IN ['screening', 'technical_review', 'business_review',
                            //            'final_decision', 'awaiting_clarification']
}
```

### `UserStats`
Per-user statistics, scoped to the session user.

```typescript
export interface UserStats {
  totalSubmitted: number;   // All ideas by this user
  totalApproved: number;    // status = 'approved'
  totalPending: number;     // status IN pipeline statuses
}
```

### `LastSubmission`
Lightweight view of the single most recently submitted idea for the current user.

```typescript
export interface LastSubmission {
  id: string;
  title: string;
  status: string;           // raw status value from DB
  submittedAt: number;      // Unix timestamp (seconds)
}
```

### Full return types

```typescript
export interface DashboardData {
  systemStats: SystemStats;
  userStats: UserStats;
  lastSubmission: LastSubmission | null;  // null if user has never submitted
}
```

---

## SQL Query Plan

### System stats query
```sql
SELECT 
  COUNT(*) AS total,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
  SUM(CASE WHEN status IN (
    'screening','technical_review','business_review',
    'final_decision','awaiting_clarification'
  ) THEN 1 ELSE 0 END) AS in_pipeline
FROM ideas;
```

### User stats + last submission (two queries)
```sql
-- Query 1: user aggregate counts
SELECT 
  COUNT(*) AS total,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
  SUM(CASE WHEN status IN (
    'screening','technical_review','business_review',
    'final_decision','awaiting_clarification'
  ) THEN 1 ELSE 0 END) AS pending
FROM ideas
WHERE submitter_id = :userId;

-- Query 2: last submission
SELECT id, title, status, submitted_at
FROM ideas
WHERE submitter_id = :userId
ORDER BY submitted_at DESC
LIMIT 1;
```

---

## File Mapping

| File | Change |
|---|---|
| `src/lib/actions/dashboard.ts` | New — `getDashboardData(db?)` server action |
| `src/lib/auth/sessionManager.ts` | Modify — `getRoleHome('submitter')` → `/home` |
| `src/app/(portal)/home/page.tsx` | New — RSC welcome page |
| `src/app/(portal)/layout.tsx` | Modify — add "Home" nav link for submitters |
| `src/components/dashboard/StatsRow.tsx` | New — system-wide stat counters |
| `src/components/dashboard/UserStatsPanel.tsx` | New — personal stats + last submission |
| `src/components/dashboard/QuickActions.tsx` | New — CTA buttons |

---

## Entity Relationships

All entities read from the existing `ideas` table:

```
users (id) ──< ideas (submitter_id, status, submitted_at, ...)
```

No foreign-key additions. No new tables.
