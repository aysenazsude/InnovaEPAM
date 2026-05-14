# Quickstart: Welcome Dashboard (Feature 008)

**Date**: 2026-05-15  
**Branch**: `008-welcome-dashboard`

---

## Overview

The welcome dashboard adds a personalised home page (`/home`) for submitter-role users. It shows system-wide statistics, per-user submission stats, the most recent submission with its live status, and quick-action links.

No DB migrations are needed. No new packages are required.

---

## File Map

| File | Role | New / Modified |
|---|---|---|
| `src/lib/actions/dashboard.ts` | Server action — `getDashboardData()` | **New** |
| `src/lib/auth/sessionManager.ts` | Post-login home for submitters → `/home` | Modified |
| `src/app/(portal)/home/page.tsx` | RSC — welcome page entry point | **New** |
| `src/app/(portal)/layout.tsx` | Add "Home" nav link for submitters | Modified |
| `src/components/dashboard/StatsRow.tsx` | System stats display | **New** |
| `src/components/dashboard/UserStatsPanel.tsx` | Personal stats + last submission | **New** |
| `src/components/dashboard/QuickActions.tsx` | CTA buttons | **New** |

---

## Dev Workflow

```bash
# 1. Run the dev server
npm run dev

# 2. Login as submitter → should land on /home (after sessionManager change)
# 3. Verify stats match actual DB state via:
sqlite3 data/innovatepam.db "SELECT status, COUNT(*) FROM ideas GROUP BY status;"

# 4. Run unit + integration tests
npm run test:unit
npm run test:integration

# 5. Typecheck + lint
npm run typecheck
npm run lint
```

---

## Test File Map

| Source file | Test file |
|---|---|
| `src/lib/actions/dashboard.ts` | `tests/integration/dashboard/getDashboardData.test.ts` |
| `src/lib/auth/sessionManager.ts` | `tests/unit/lib/auth/sessionManager.test.ts` (extend) |
| `src/components/dashboard/StatsRow.tsx` | `tests/unit/components/dashboard/StatsRow.test.tsx` |
| `src/components/dashboard/UserStatsPanel.tsx` | `tests/unit/components/dashboard/UserStatsPanel.test.tsx` |
| `src/components/dashboard/QuickActions.tsx` | `tests/unit/components/dashboard/QuickActions.test.tsx` |

---

## Validation Checklist (before merge)

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero new warnings
- [ ] `npm run test:unit` — all suites pass
- [ ] `npm run test:integration` — all suites pass, including new `getDashboardData` suite
- [ ] Submitter login → redirects to `/home`
- [ ] `/home` shows correct zero-state when user has no ideas
- [ ] `/home` shows correct counts after submitting an idea
- [ ] Last submission card shows correct status after pipeline transition
- [ ] Admin login → redirects to `/admin` (unchanged)
- [ ] Mobile layout verified at 320px width (no horizontal overflow)
