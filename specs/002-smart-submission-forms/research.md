# Research: Smart Submission Forms — Phase 2

**Feature**: `002-smart-submission-forms`  
**Generated**: 2026-05-13  
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## 1. Dynamic Field Rendering Strategy

**Decision**: React `useState`-driven visibility inside the existing `'use client'` `IdeaForm` component.

**Rationale**: `IdeaForm` is already a client component using `useActionState`. Adding a `selectedCategory` state variable and passing it to a child `CategoryFields` component is the minimal, idiomatic extension. No URL params, no server round-trips, no new routing required. Field switching is instant (< 1 ms), satisfying SC-001's 200 ms target by a large margin.

**Alternatives considered**:
- *Server-side form submission per category change* — rejected: requires a full round-trip per change, cannot meet < 200 ms target, adds complexity.
- *URL search params (`?category=…`) + server component re-render* — rejected: browser navigation on every category change is disruptive UX; shared field values would be lost unless managed via URL params too.

---

## 2. Configuration Module Design

**Decision**: Pure TypeScript `Record<CategorySlug, FieldDefinition[]>` objects in two co-located modules: `categoryFieldConfig.ts` and `categoryGuidanceConfig.ts`.

**Rationale**: Static configuration that changes only with a code deployment (categories are fixed per Assumption 1). Pure functions with no runtime dependencies are trivially unit-testable without mocking. Tree-shaken at build time; zero runtime overhead. Type-safety is maximal: `CategorySlug` is already defined in `src/lib/constants.ts` and shared.

**`FieldDefinition` shape**:
```typescript
interface FieldDefinition {
  name: string;          // FormData key; also the JSON key in idea_category_data.fields
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: readonly string[];   // for select only
  maxLength?: number;            // for text and textarea
  placeholder?: string;
}
```

**Alternatives considered**:
- *Runtime DB configuration (editable by admins)* — rejected: over-engineered for a fixed list; adds a config-management UI to Phase 2 scope.
- *Single merged object (fields + guidance together)* — rejected: violates SRP; unit tests for field config and guidance config would be coupled.

---

## 3. Data Persistence Shape

**Decision**: New `idea_category_data` table — one row per idea, `fields` column as `TEXT` with JSON serialisation.

**Schema**:
```sql
CREATE TABLE idea_category_data (
  idea_id    TEXT PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  fields     TEXT NOT NULL,   -- JSON: { fieldName: value | null }
  created_at INTEGER NOT NULL
);
```

**Drizzle ORM column**: `text('fields', { mode: 'json' })` — handled as `Record<string, string | null>` in TypeScript; Drizzle serialises/deserialises automatically.

**Rationale**: Isolates category-specific data from the core `ideas` table (no nullable column sprawl); the JSON column avoids EAV complexity while remaining queryable for the single-row-per-idea access pattern. `ON DELETE CASCADE` ensures orphan rows are cleaned up if an idea is ever deleted.

**Alternatives considered**:
- *JSONB column added to `ideas` table* — rejected: pollutes the core entity with variable optional data; requires a potentially breaking migration to a table that already has rows in production.
- *EAV table (one row per field per idea)* — rejected: 2× the rows for no benefit at Phase 2 scale; more complex JOIN to reconstruct the field map.

---

## 4. Progressive Enhancement (No-JS Fallback)

**Decision**: Server-side pre-render of all category field groups as visible HTML; client hydration hides non-matching groups via React state.

**Implementation approach**:
- The `IdeaForm` server render (SSR) initialises `selectedCategory` as `undefined`. The `CategoryFieldsStatic` fallback renders all four category groups (Technical Innovation, Process Improvement, Client Solution, Product Enhancement) inside a `<noscript>` element — each group wrapped in a labelled `<fieldset>` with a `<legend>` naming the category.
- After React hydration, the `'use client'` component takes over: the `<noscript>` block is invisible to JS-enabled browsers; the dynamic `CategoryFields` component renders only the selected category's fields.
- This means JS-disabled browsers see all fields (with clear category labels), satisfying FR-016. JS-enabled browsers see only the selected category's fields, satisfying FR-001 / FR-002.

**Rationale**: `<noscript>` is the simplest, most robust progressive-enhancement pattern in Next.js. It requires no CSS tricks, no `suppressHydrationWarning`, and no flash-of-unstyled-content.

**Alternatives considered**:
- *Render all groups initially hidden, then `useEffect` to show the matching one* — rejected: causes a flash on hydration (all fields visible → selected only visible within one paint frame).
- *Separate server component for no-JS + client component for JS* — rejected: duplicates the field rendering logic; two maintenance surfaces.

---

## 5. ARIA Live Regions

**Decision**: `aria-live="polite"` + `role="status"` on both the guidance text container and the category fields container. `role="alert"` on validation error messages.

**Rationale**: Polite live regions do not interrupt ongoing screen reader speech — appropriate for a form enhancement where the user has just made a selection and the reader should finish any in-progress announcement first. `role="alert"` (implicitly `aria-live="assertive"`) is reserved for validation errors because those are urgent and time-sensitive.

**Implementation**:
```tsx
<div role="status" aria-live="polite" aria-atomic="false">
  {/* guidance text */}
</div>
<div role="status" aria-live="polite" aria-atomic="false">
  {/* dynamic category fields */}
</div>
```
`aria-atomic="false"` allows the screen reader to announce only the changed child nodes, not re-read the entire container.

---

## 6. Character Counter Implementation

**Decision**: Uncontrolled textarea with `onChange` tracking `value.length`, displaying `{max - current} characters remaining`. Counter turns red at ≤ 50 characters remaining (visible warning). Pattern mirrors the Phase 1 description field counter.

**Rationale**: Consistency with Phase 1 (SC-003 / Assumption 6). The counter is a cosmetic enhancement on top of the `maxLength` HTML attribute — even if JS fails mid-session, the browser `maxLength` enforcement is the safety net.

---

## 7. Admin Detail View Integration

**Decision**: Extend the existing `src/app/(portal)/admin/[id]/page.tsx` server component to LEFT JOIN `idea_category_data` when fetching the idea. Pass `categoryData` to the existing `IdeaDetail` client component as a new optional prop. Add a "Category Details" `<section>` rendered only when `categoryData?.fields` has at least one non-null value.

**Rationale**: Minimal surface change — one additional DB query (a simple primary-key lookup on `idea_category_data`), one new prop, one new UI section. No new page or route needed (FR-017).

---

## 8. Server Action Extension Strategy

**Decision**: Extend `submitIdea` in `src/lib/actions/ideas.ts` — after the existing idea insert, read the active category's field names from `CATEGORY_FIELDS[category]`, collect their FormData values, validate lengths, then insert into `idea_category_data`.

**Rationale**: Keeps all submission logic in one server action. The category field collection is driven by config (not by dynamic FormData enumeration), preventing mass-assignment vulnerabilities — only keys declared in `CATEGORY_FIELDS[category]` are read and persisted.

**Security note**: FormData keys not present in `CATEGORY_FIELDS[category]` are explicitly ignored. The `fields` JSON object is constructed from the whitelist, not from all FormData entries.
