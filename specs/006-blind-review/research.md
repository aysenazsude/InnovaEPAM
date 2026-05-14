# Research: Blind Review (Anonymous Evaluation)

**Phase**: 0 — Outline & Research  
**Feature**: 006-blind-review  
**Date**: 2026-05-14

## Resolved Unknowns

### 1. Where is submitter identity currently exposed in admin-facing views?

**Decision**: Two locations require changes; a third requires data hygiene.

| Location | Exposure | Action |
|---|---|---|
| `src/app/(portal)/admin/ideas/[id]/review/page.tsx` line 75 | `{idea.submitterId}` rendered inside `<strong>` | Replace with constant `ANONYMOUS_SUBMITTER_LABEL` |
| `src/components/admin/AdminIdeaList.tsx` | `submitterId` field present in RSC-serialized prop payload (client component receives full `IdeaWithAttachments`), not rendered but present in HTML source | Strip `submitterId` before passing to client component |
| `src/app/(portal)/admin/ideas/[id]/page.tsx` | No submitter identity rendered — clean | No change required |

**Rationale**: Both FR-001 (no rendering) and FR-009 (no indirect exposure via HTML source) must be satisfied. The RSC payload for `AdminIdeaList` (a `'use client'` component) is serialized and embedded in the page; `submitterId` would be visible in browser dev tools if not stripped.

**Alternatives considered**:
- Returning a separate SQL query for admin views without the `submitter_id` column — rejected as over-engineering; a DTO transformation at the server component boundary is simpler and avoids changing the data access layer.
- A server-side `anonymize` middleware — rejected; Next.js App Router does not have a general middleware layer that can intercept RSC props.

---

### 2. Should anonymisation be a data-access-layer concern or a presentation-layer concern?

**Decision**: Presentation layer only. The `submitterId` column is never removed from the database or from the `IdeaWithAttachments` DTO internally. It is stripped only at the point where data is passed to admin-facing client components or rendered in admin server components.

**Rationale**: The spec (FR-004) explicitly states "anonymisation is a display-layer concern only and MUST NOT alter stored data." Notifications (FR-005) and audit (FR-003 Story 3) both require the real identity to be present server-side.

---

### 3. How should the anonymous label be surfaced?

**Decision**: Add `ANONYMOUS_SUBMITTER_LABEL = 'Anonymous Submitter'` to `src/lib/constants.ts`. All admin-facing components that would display submitter identity use this constant.

**Rationale**: Using a named constant (not inline string literals) satisfies Constitution Principle I (no magic strings). A single constant makes future policy changes (e.g., translating the label) a one-line edit.

**Alternatives considered**: A dedicated utility function `anonymizeSubmitter(id: string): string` — rejected as unnecessary abstraction; the transformation is trivial (`return ANONYMOUS_SUBMITTER_LABEL`) and a constant is sufficient.

---

### 4. How should `submitterId` be stripped from admin client-component props?

**Decision**: Create a `toAdminIdeaView(idea: IdeaWithAttachments): AdminIdeaView` helper in `src/lib/ideas/anonymize.ts`. `AdminIdeaView` is `Omit<IdeaWithAttachments, 'submitterId'>`. Admin server components call this before passing ideas to client components.

**Rationale**: Using TypeScript's `Omit` type enforces the contract at compile time — if a client component tries to access `submitterId`, TypeScript will error. The helper is a pure function, easily testable, and lives with other idea-related utilities.

**Alternatives considered**:
- Destructuring `{ submitterId: _omit, ...rest }` inline in each page — rejected; duplicates logic and cannot be tested in isolation.
- A new `getAdminIdeasAnonymized()` server action — rejected; changes the data access layer unnecessarily. The transformation belongs at the component boundary.

---

### 5. Does the pipeline stage history expose submitter identity?

**Decision**: No change needed. The `StageTransitionView` type only contains `adminDisplayName`, `stage`, `action`, `notes`, `createdAt` — no submitter fields. Confirmed in `src/lib/pipeline/pipelineRepository.ts` line 20.

---

### 6. Are there other admin-facing routes or API endpoints that return submitter identity?

**Decision**: The API route `src/app/api/attachments/[id]` returns file content and headers only (no submitter identity). The API route `src/app/api/auth/` handles authentication only. No additional routes require changes.

**Rationale**: Searched all admin-routed pages (`src/app/(portal)/admin/**`) and all API handlers for `submitterId` / `displayName` / `email` rendering. Only the two locations identified in finding #1 require action.

---

## Summary of Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Presentation-layer-only anonymisation | FR-004: stored data must not change |
| 2 | `ANONYMOUS_SUBMITTER_LABEL` constant in `constants.ts` | Constitution I: no magic strings |
| 3 | `AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'>` DTO | FR-009: no indirect exposure via HTML source; compile-time enforcement |
| 4 | `toAdminIdeaView()` pure helper in `src/lib/ideas/anonymize.ts` | Testable, single responsibility, reusable |
| 5 | No schema/migration changes | FR-004: display layer only |
| 6 | No new dependencies | Constitution III: no new packages for a string substitution |
