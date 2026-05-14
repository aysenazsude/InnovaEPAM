# Research: Scoring System (Feature 007)

**Status**: All unknowns resolved  
**Date**: 2026-05-15

---

## Unknown 1 — Schema approach: normalized table vs. JSON in existing table

**Decision**: New normalized table `evaluation_scores`  
**Rationale**: A dedicated table allows SQL `AVG()` aggregation without JSON parsing, supports indexed queries per dimension and per idea, and is consistent with how `stage_transitions` was introduced in Feature 005. Embedding scores as JSON in `stageTransitions.notes` would conflate structured data with free-text and prevent efficient aggregate queries.  
**Alternatives considered**: (A) JSON column in `stage_transitions` — rejected because aggregate queries require parsing at application level, which is error-prone and slow. (B) Separate `evaluation_score_sets` + `evaluation_score_items` two-table design — rejected as over-engineering for five fixed dimensions.

---

## Unknown 2 — Scoring UI control: radio buttons vs. select vs. star widget

**Decision**: HTML `<input type="radio">` groups with numeric labels 1–5, styled with Tailwind  
**Rationale**: Radio buttons are natively accessible (keyboard-navigable, ARIA-correct) with zero additional dependencies. Five options inline is a comfortable width on desktop and wraps cleanly on mobile. A custom star widget would require either a new npm package (violates Principle III) or significant bespoke CSS. A `<select>` is less intuitive for a 1–5 scale comparison.  
**Alternatives considered**: Star-rating widget — requires new package. `<select>` — functional but poor UX for comparative scoring. Range slider — poor precision for discrete 1–5 values.

---

## Unknown 3 — Passing optional scores alongside existing form data

**Decision**: Add optional `<input type="number" name="score_{dimension}" min="1" max="5">` hidden inputs that are populated by the `ScoringPanel` radio selection, submitted as part of the existing `advanceStage` / `rejectAtStage` / `approveAtFinalDecision` form actions  
**Rationale**: The existing server actions already receive `FormData`. Reading additional optional fields from the same `FormData` avoids a separate API call or action, keeps the user's submission atomic (scores + notes + action in one request), and requires no changes to the server action signatures — only their internal logic.  
**Alternatives considered**: Separate `submitScores` server action called independently — rejected because it creates a race condition where scores and the transition record could arrive out of order. A new API route — rejected as unnecessary complexity.

---

## Unknown 4 — Aggregate score computation strategy

**Decision**: SQL `AVG()` computed at read time via a Drizzle subquery / LEFT JOIN in `pipelineRepository.ts`  
**Rationale**: SQLite with WAL mode handles simple AVG aggregations over small result sets (max ~20 transitions per idea × 5 dimensions = ~100 rows) with negligible overhead. Caching or pre-computing aggregates would be premature optimisation. The aggregate is computed once per page load in an RSC (no client-side re-computation needed).  
**Alternatives considered**: Application-level average computed after fetching all score rows — acceptable but requires an extra round-trip and manual arithmetic. Materialised view — not supported in SQLite without triggers; overkill for this scale.

---

## Unknown 5 — Aggregate score on the admin idea list

**Decision**: Extend the ideas query in `admin/page.tsx` RSC to include `aggregateScore: number | null` via a Drizzle `leftJoin` subquery (or a separate `getIdeaScoreAverages()` call that returns a map of ideaId → average, merged in the RSC)  
**Rationale**: The admin list already fetches all ideas in one query. A second parallel query returning `{ ideaId, avg }` pairs and merging them in the RSC is the simplest approach that avoids a complex correlated subquery while keeping the ideas query unchanged. The `AdminIdeaView` DTO (from Feature 006) can be extended with an optional `aggregateScore?: number` field without breaking existing tests.  
**Alternatives considered**: Correlated subquery in Drizzle — possible but makes the ideas query more complex and harder to test. Client-side fetch — unnecessary round-trip and breaks the RSC data-fetching pattern.

---

## Unknown 6 — Score immutability: enforcement strategy

**Decision**: No edit or delete endpoints are created for `evaluation_scores`. The table has no `updatedAt` column and no server action exposes mutation. Scores are written once inside the same DB transaction as the stage transition insertion.  
**Rationale**: The simplest enforcement of immutability is absence of mutation APIs. The admin UI renders scores read-only (display only, no edit form). The constitution (Principle I) prohibits dead code and unused endpoints, so no placeholder edit routes should be created.  
**Alternatives considered**: Database-level trigger preventing UPDATE/DELETE — adds complexity without benefit since the application layer already provides no mutation path. Row-level permissions — not applicable in SQLite without application-level checks which are already achieved by absence of routes.
