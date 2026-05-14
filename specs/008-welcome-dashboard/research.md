# Research: Welcome Dashboard (Feature 008)

**Date**: 2026-05-15  
**Branch**: `008-welcome-dashboard`

---

## Unknown 1: What route should the welcome page live at?

**Decision**: `/home` under the existing `(portal)` route group (`src/app/(portal)/home/page.tsx`).

**Rationale**: The portal group already enforces auth via its layout. Creating `/home` inside it inherits the session check, navigation bar, and layout with zero extra auth code. The root `/` stays a redirect to `/login` for unauthenticated users, which keeps the existing middleware and E2E flows intact.

**Alternatives considered**:
- Replace `src/app/page.tsx` with the welcome component — breaks unauthenticated root behaviour and middleware assumptions.
- Name it `/welcome` — less conventional; `/home` is the idiomatic "portal home" name.

---

## Unknown 2: Does `getRoleHome` change for submitters?

**Decision**: Yes — update `src/lib/auth/sessionManager.ts` so that `getRoleHome('submitter')` returns `/home` instead of `/ideas`.

**Rationale**: The spec requires the welcome page to be the landing point immediately after login. The only place that controls post-login destination is `getRoleHome`. The `/ideas` route continues to exist and is linked from the welcome page and the nav bar.

**Alternatives considered**:
- Keep `/ideas` as default and add a banner there — fails the spec requirement for a dedicated, stat-rich welcome experience.
- Add `/home` as an alias for `/ideas` — duplicates content, no per-user stat panel.

---

## Unknown 3: Are new DB tables or migrations needed?

**Decision**: No new tables. All statistics are computed from the existing `ideas` table using `COUNT(*) GROUP BY status`.

**Rationale**: The schema already records `status`, `submitterId`, `submittedAt`, and `evaluatedAt` on every idea. System-wide totals and per-user counts are simple aggregations over these columns. No migration is needed.

**Alternatives considered**:
- Materialised stats table updated on each transition — unnecessary complexity given SQLite performance at this scale.

---

## Unknown 4: Where should the stats query live?

**Decision**: New server action file `src/lib/actions/dashboard.ts` exporting `getSystemStats(db?)` and `getUserStats(db?)`. This avoids bloating `ideas.ts` (already 200+ lines) and keeps dashboard logic cohesive.

**Rationale**: Single Responsibility. The `ideas.ts` file owns CRUD for individual ideas; aggregate dashboard statistics are a distinct concern. A separate `dashboard.ts` action also makes the unit of testability clean.

**Alternatives considered**:
- Add stats functions to `ideas.ts` — violates SRP; would push the file toward the 300-line limit.
- Add them to `pipeline.ts` — wrong domain; system stats span all statuses, not just pipeline ones.

---

## Unknown 5: What does the admin see on `/home`?

**Decision**: Admins are **not redirected to `/home`**. `getRoleHome('admin')` continues to return `/admin`. The admin already has a rich dashboard. No admin-specific welcome page is in scope.

**Rationale**: The spec (FR-008) says the admin view "MAY be supplemented" — not required. The admin dashboard already shows pipeline counts and idea lists. Duplicating that on a welcome page adds no value. Scope is P1–P3 for submitters; admin welcome is explicitly out of scope for v1.

**Alternatives considered**:
- Show admin stats on `/home` and redirect admins there too — out of scope, increases plan complexity, admin already well served.

---

## Unknown 6: What personal stats are shown and how computed?

**Decision**: Derive all user stats from a single DB query on the `ideas` table filtered by `submitterId`:
- **Total submitted** → `COUNT(*)` where `submitterId = user.id`
- **Total approved** → `COUNT(*)` where `submitterId = user.id AND status = 'approved'`
- **Total pending** → `COUNT(*)` where `submitterId = user.id AND status IN (...pipeline statuses)`
- **Last submission** → single `SELECT ... ORDER BY submitted_at DESC LIMIT 1`

This avoids fetching full idea bodies + attachments for stats.

**Rationale**: `getMyIdeas()` fetches full rows with attachments (LEFT JOINs) for the list page. For stats we need only aggregate counts plus one lightweight row. A dedicated lean query is faster and simpler.

**Alternatives considered**:
- Reuse `getMyIdeas()` and compute stats client-side — unnecessarily transfers all idea bodies and attachments just to count them.

---

## Unknown 7: What is the exact set of status values counted as "in pipeline"?

**Decision**: `['screening', 'technical_review', 'business_review', 'final_decision', 'awaiting_clarification']` — exactly the set already used by `getPipelineCounts` in `pipelineRepository.ts`.

**Rationale**: Consistency with the existing codebase definition of "active pipeline" avoids divergence.

---

## Unknown 8: Should the nav bar get a "Home" link for submitters?

**Decision**: Yes — add a "Home" link to `/home` as the first nav item for submitter-role users in the portal layout. "My Ideas" and "My Drafts" remain.

**Rationale**: The spec (FR-007) requires one-click access to the ideas list from the welcome page; symmetrically, one-click access to the welcome page from everywhere else requires a nav link. Without it, users must use the browser back button.

---

## Summary

| Item | Resolution |
|---|---|
| Route | `/home` under `(portal)` group |
| Post-login for submitter | `getRoleHome` → `/home` |
| DB migrations | None |
| Stats queries | New `src/lib/actions/dashboard.ts` |
| Admin welcome page | Out of scope — admin uses `/admin` |
| User stats computation | Lean SQL aggregation query, no full-row fetch |
| Pipeline status set | Same as `getPipelineCounts` |
| Nav update | Add "Home" link for submitters |
