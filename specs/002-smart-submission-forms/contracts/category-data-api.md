# Contract: Category Data API — Phase 2

**Feature**: `002-smart-submission-forms`  
**Generated**: 2026-05-13  
**Scope**: Changes to the `submitIdea` server action and the admin idea detail data shape.  
**Consumer**: `IdeaForm` (client component), admin `[id]/page.tsx` (server component)

---

## 1. `submitIdea` Server Action — Extended Input Contract

### Signature (unchanged)

```typescript
async function submitIdea(
  _prevState: SubmitIdeaResult | null,
  formData: FormData,
  dbInstance?: DB
): Promise<SubmitIdeaResult>
```

### Extended FormData Keys

In addition to the existing keys (`title`, `description`, `category`, `file`), the action now accepts **category-specific field keys** when the submitted category is not `other`.

The accepted keys per category are determined by `CATEGORY_FIELDS[category]` from `src/lib/ideas/categoryFieldConfig.ts`. Keys **not** present in `CATEGORY_FIELDS[category]` are **ignored** (whitelist enforcement — prevents mass assignment).

| Category slug | Accepted additional FormData keys |
|---|---|
| `technical_innovation` | `technology_area`, `estimated_effort` |
| `process_improvement` | `affected_team`, `current_pain_point` |
| `client_solution` | `target_client_segment`, `client_problem_statement` |
| `product_enhancement` | `affected_product`, `proposed_user_benefit` |
| `other` | _(none)_ |

### Extended Return Shape

```typescript
interface SubmitIdeaResult {
  errors?: {
    title?: string;
    description?: string;
    category?: string;
    file?: string;
    // Phase 2 additions — category-specific field errors
    technology_area?: string;
    estimated_effort?: string;
    affected_team?: string;
    current_pain_point?: string;
    target_client_segment?: string;
    client_problem_statement?: string;
    affected_product?: string;
    proposed_user_benefit?: string;
  };
}
```

Errors are keyed by FormData field name, enabling inline display next to each offending field (FR-004 / Clarification Q2).

### Validation Rules for Category Fields

| Field | Type | Rule |
|---|---|---|
| `technology_area` | select | Must be one of: `Frontend`, `Backend`, `Infrastructure`, `Data / AI`, `Security`, `Other`. Optional (empty = not stored). |
| `estimated_effort` | select | Must be one of: `Days`, `Weeks`, `Months`. Optional (empty = not stored). |
| `affected_team` | text | Max 100 characters. Optional. |
| `current_pain_point` | textarea | Max 500 characters. Optional. |
| `target_client_segment` | text | Max 100 characters. Optional. |
| `client_problem_statement` | textarea | Max 500 characters. Optional. |
| `affected_product` | text | Max 100 characters. Optional. |
| `proposed_user_benefit` | textarea | Max 500 characters. Optional. |

All category-specific fields are **optional** — their absence does not produce an error.

### Side Effects on Success

On a successful insertion, the action also inserts one row into `idea_category_data`:

```typescript
{
  ideaId:    <newly created idea id>,
  category:  <submitted category slug>,
  fields:    { [fieldName]: value | null },  // only whitelisted keys; null for empty
  createdAt: <Unix seconds>
}
```

If all category-specific fields are empty (including `other` category), `fields` is stored as `{}`. A row is **always** inserted (even for empty fields) so admin queries have a consistent join target.

---

## 2. Admin Idea Detail — Extended Response Shape

The admin `[id]/page.tsx` server component fetches idea detail by left-joining `idea_category_data`.

### Extended Prop Passed to `IdeaDetail`

```typescript
interface IdeaDetailProps {
  idea: Idea;                          // unchanged from Phase 1
  attachment: Attachment | null;       // unchanged from Phase 1
  categoryData: IdeaCategoryData | null; // NEW — null if no row exists
}
```

### `IdeaDetail` Rendering Contract for `categoryData`

- If `categoryData` is `null` → do **not** render "Category Details" section.
- If `categoryData.fields` is an empty object (`{}`) → do **not** render "Category Details" section.
- Otherwise → render a `<section>` labelled "Category Details" with one `<dl>` entry per non-null, non-empty field value:

```
Category Details
  Technology Area    Backend
  Estimated Effort   Weeks
```

Field labels are derived from `CATEGORY_FIELDS[categoryData.category]` — the `label` property of each matching `FieldDefinition`. Fields with a `null` or empty-string value in `fields` are omitted from display.

---

## 3. Breaking Changes from Phase 1

| Area | Change | Migration required |
|---|---|---|
| `idea_category_data` table | New table added | `0001_add_idea_category_data.sql` |
| `submitIdea` FormData | New optional keys accepted | None — additive only |
| `SubmitIdeaResult.errors` | New optional error keys | None — additive only |
| `IdeaDetail` component props | New `categoryData` prop (nullable) | None — defaults to null |

No Phase 1 API surface is removed or incompatibly changed.
