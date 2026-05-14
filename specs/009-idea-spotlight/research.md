# Research: Idea Spotlight & News Section

**Phase**: 0 — All unknowns resolved before Phase 1 design  
**Branch**: `009-idea-spotlight`  
**Date**: 2026-05-15

---

## Decision 1: Composite Score Computation

**Decision**: Compute the composite score for the spotlight as `AVG(score)` across all rows in `evaluation_scores` for a given `idea_id`, grouped by `idea_id`. This is a simple arithmetic mean across all scoring dimensions contributed by all evaluators.

**Rationale**: The `evaluation_scores` table stores one row per `(stageTransitionId, dimension)` pair. There is no separate "finalScore" column. The scoring system (Feature 007) intentionally stores raw per-dimension scores and computes aggregates on read. Using `AVG(score)` across all rows for an idea produces a single comparable number that ranks ideas consistently.

**Alternatives considered**:
- Per-stage weighted average: rejected — adds complexity with no business justification from spec.
- Separate materialised score column on `ideas`: rejected — violates normalisation and requires sync logic.
- Median instead of mean: rejected — mean is simpler to compute in SQL and sufficient for ranking.

**SQLite query pattern**:
```sql
SELECT idea_id, AVG(score) as composite_score
FROM evaluation_scores
GROUP BY idea_id
```

---

## Decision 2: Calendar-Month Boundary in SQLite

**Decision**: Use `strftime('%Y-%m', datetime(submitted_at / 1000, 'unixepoch'))` to extract the `YYYY-MM` string from the `submittedAt` integer field (stored as Unix milliseconds). The current month string is computed in application code as `new Date().toISOString().slice(0, 7)` (e.g. `"2026-05"`).

**Rationale**: `submittedAt` is an integer column storing Unix milliseconds (consistent with JavaScript `Date.now()` usage throughout the codebase). SQLite's `strftime` with `'unixepoch'` expects seconds, so we divide by 1000. Computing the target month in JavaScript avoids SQLite date-function portability concerns and keeps the query testable with injected timestamps.

**Pattern confirmed by**: `0005_glorious_risque.sql` uses plain `integer` timestamps; `dashboard.ts` orders by `${ideas.submittedAt} DESC` directly, confirming millisecond epoch storage.

**For `evaluatedAt`** (approval date): Same pattern — `strftime('%Y-%m', datetime(evaluated_at / 1000, 'unixepoch'))`.

---

## Decision 3: Editor's Pick Monthly Expiry — No Cron Required

**Decision**: Store the Editor's Pick as a `spotlight_picks` row with a `month_year TEXT` column (e.g. `'2026-05'`). At query time, filter by `month_year = currentMonthString`. Picks for previous months are simply ignored — no deletion or cron job is needed.

**Rationale**: SQLite has no built-in scheduler and Next.js has no persistent background process in App Router. Storing `month_year` as a string and matching it against the current month at query time is zero-infrastructure: old picks remain in the table but are never surfaced. This is the simplest design that satisfies the "auto-expires at month boundary" requirement.

**Table uniqueness**: A `UNIQUE` constraint on `month_year` ensures at most one Editor's Pick per month. Inserting a new pick for the same month uses an upsert (`INSERT OR REPLACE`) pattern — Drizzle's `.onConflictDoUpdate()`.

**Alternatives considered**:
- Scheduled deletion job (cron / Vercel Cron): rejected — requires infrastructure not in the project.
- Soft-delete flag: rejected — unnecessary when month_year filtering achieves the same result.
- Single-row "current pick" table: rejected — loses history; harder to audit who pinned what and when.

---

## Decision 4: Spotlight Candidate Selection Algorithm

**Decision**: The server action resolves the spotlight in this priority order:
1. **Editor's Pick**: Query `spotlight_picks` for `month_year = currentMonth`. If found, join `ideas` + `users` to get full idea detail. Label it "Editor's Pick".
2. **Highest-scored idea this month**: Left-join `ideas` with `evaluation_scores`, filter by `submittedAt` in current month, group by `idea_id`, order by `AVG(score) DESC, submittedAt DESC`, take top 1. Label it "Top Rated".
3. **Most recent unscored idea this month**: If step 2 returns nothing (no scored ideas this month), query `ideas` filtered by current month, no score requirement, order by `submittedAt DESC`, take top 1. Label it "Score Pending".
4. **Empty**: If no ideas submitted this month, return `null` for the spotlight. The UI shows a friendly empty state.

**Rationale**: This 4-step cascade cleanly handles all edge cases from the spec without special-casing in the component layer. Each step maps directly to an acceptance scenario.

---

## Decision 5: Recently Approved Feed — Source of Approval Date

**Decision**: Use `ideas.evaluatedAt` as the "approval date" for ordering the recently approved feed. Filter: `status = 'approved' AND evaluatedAt IS NOT NULL`, order by `evaluatedAt DESC`, limit 5.

**Rationale**: `evaluatedAt` is set when any evaluation action (including approval) is taken. It is the most accurate proxy for "when this idea was approved" without requiring a new column. This field already exists in the schema and is populated by the evaluation flow.

**Alternatives considered**:
- Adding a dedicated `approvedAt` column: rejected — `evaluatedAt` already serves this purpose; adding a redundant column violates Principle I (clean code / no dead fields).
- Using `submittedAt`: rejected — that's when the idea was submitted, not when it was approved.

---

## Decision 6: Monthly Activity Strip — Metric Definitions

**Decision**: The three strip metrics are computed as follows, all scoped to the current calendar month:
- **Submitted**: `COUNT(*)` from `ideas` where `submittedAt` is in current month (regardless of current status).
- **In Review**: `COUNT(*)` from `ideas` where `submittedAt` is in current month AND `status IN ('screening', 'technical_review', 'business_review', 'final_decision', 'awaiting_clarification')`.
- **Approved**: `COUNT(*)` from `ideas` where `evaluatedAt` is in current month AND `status = 'approved'`.

**Rationale**: Using `submittedAt` for "submitted" and "in review" keeps them aligned with the same cohort (ideas submitted this month). Using `evaluatedAt` for "approved" captures ideas approved this month regardless of when they were submitted, which is the operationally useful metric for admins tracking throughput.

**Alternatives considered**:
- All three scoped to `submittedAt`: rejected — "approved this month" should capture ideas approved this month, not ideas submitted-this-month-and-now-approved (too restrictive early in the month).
- All three scoped to current status only (no date filter): rejected — would show all-time counts, not monthly pulse data.

---

## Decision 7: Admin Pin/Unpin UX Location

**Decision**: Add "Pin as Editor's Pick" / "Unpin" action buttons to the existing `AdminIdeaList` idea cards (inline action, not a separate page). Server actions `pinEditorsPick(ideaId)` and `unpinEditorsPick()` are called via form actions (no client-side JS required).

**Rationale**: The admin already has a list view of all ideas. Adding an inline action avoids creating a new admin detail page, which would require a new route and layout. The spec says "a simple action on the existing admin idea detail view" — since there is no dedicated detail page, the list card is the equivalent surface. Form-action-based mutations align with the existing pattern used across the codebase.

**Alternatives considered**:
- New `/admin/ideas/[id]` detail page: rejected — over-engineering for a single button action.
- Client-side fetch with `useTransition`: rejected — server-action form pattern already used consistently; adding a client component just for this violates Principle I (simplicity).

---

## Open Items

None — all NEEDS CLARIFICATION items resolved above.
