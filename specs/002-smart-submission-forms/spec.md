# Feature Specification: Smart Submission Forms — Phase 2

**Feature Branch**: `002-smart-submission-forms`
**Created**: 2026-05-13
**Status**: Draft
**Scope**: Phase 2 — Dynamic category-specific form fields and contextual guidance for idea submission

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Category-Specific Fields Appear Dynamically (Priority: P1)

An authenticated submitter opens the idea submission form, selects a category from the dropdown, and immediately sees a set of additional input fields relevant to that category appear below the shared fields — without a page reload. When the submitter changes the category, the previous category-specific fields are replaced by the ones appropriate to the newly selected category.

**Why this priority**: This is the core mechanic of the feature. Displaying targeted fields guides submitters to provide the structured information evaluators need most for each idea type, directly improving evaluation quality and efficiency.

**Independent Test**: A tester logs in as a submitter, opens the submission form, selects each category in turn, and verifies that the correct category-specific fields appear for each selection — independent of any evaluation or admin action.

**Acceptance Scenarios**:

1. **Given** an authenticated submitter is on the submission form and has not selected a category, **When** the page loads, **Then** only the shared fields (title, description, category) are visible; no category-specific fields are shown.
2. **Given** a submitter selects "Technical Innovation", **When** the selection is made, **Then** the fields "Technology Area" (dropdown) and "Estimated Effort" (dropdown) appear below the shared fields without a page reload.
3. **Given** a submitter selects "Process Improvement", **When** the selection is made, **Then** the fields "Affected Team / Department" (text input, max 100 characters) and "Current Pain Point" (text area, max 500 characters) appear.
4. **Given** a submitter selects "Client Solution", **When** the selection is made, **Then** the fields "Target Client Segment" (text input, max 100 characters) and "Client Problem Statement" (text area, max 500 characters) appear.
5. **Given** a submitter selects "Product Enhancement", **When** the selection is made, **Then** the fields "Affected Product / Feature" (text input, max 100 characters) and "Proposed User Benefit" (text area, max 500 characters) appear.
6. **Given** a submitter selects "Other", **When** the selection is made, **Then** no additional fields appear; only the shared fields remain visible.
7. **Given** a submitter has selected "Technical Innovation" and filled in its specific fields, **When** they change the category to "Process Improvement", **Then** the Technical Innovation fields are hidden and cleared, and the Process Improvement fields appear empty.

---

### User Story 2 — Category-Specific Guidance Text (Priority: P2)

When a submitter selects a category, a brief contextual guidance message appears alongside (or immediately above) the category-specific fields, explaining what information evaluators are looking for in that category and providing a writing tip.

**Why this priority**: Guidance text is a quality multiplier on top of the dynamic fields. Submitters who understand what evaluators need will write more useful submissions, reducing back-and-forth and rejected ideas lacking detail.

**Independent Test**: A tester selects each category and verifies the correct guidance text appears for each, and that guidance disappears (or is replaced) when the category changes — without needing to submit or save anything.

**Acceptance Scenarios**:

1. **Given** a submitter has not yet selected a category, **When** the form loads, **Then** no guidance text is shown.
2. **Given** a submitter selects "Technical Innovation", **When** the selection is made, **Then** guidance text reading "Describe the technical problem this solves, the proposed approach, and the expected measurable improvement." appears in a visually distinct area near the category-specific fields.
3. **Given** a submitter selects "Process Improvement", **When** the selection is made, **Then** guidance text reading "Explain the current inefficiency, who is affected, and how this idea would improve the situation." appears.
4. **Given** a submitter selects "Client Solution", **When** the selection is made, **Then** guidance text reading "Describe the client's challenge clearly and explain how this idea addresses their pain point and the value it delivers." appears.
5. **Given** a submitter selects "Product Enhancement", **When** the selection is made, **Then** guidance text reading "Describe the current limitation and how this enhancement would improve the user experience or product capability." appears.
6. **Given** a submitter selects "Other", **When** the selection is made, **Then** guidance text reading "Please provide as much detail as possible to help evaluators understand and assess your idea." appears.
7. **Given** a submitter changes the category from one value to another, **When** the new category is selected, **Then** the previous guidance text is replaced by the guidance text for the newly selected category.

---

### User Story 3 — Shared Fields Preserved When Switching Categories (Priority: P3)

When a submitter changes the selected category, the values they have already typed in the shared fields (title and description) are preserved. Only the category-specific fields are cleared.

**Why this priority**: Losing shared field content when switching categories would frustrate submitters and is a clear usability regression. This story protects the core interaction from data loss.

**Independent Test**: A tester types a title and description, selects a category, fills in category-specific fields, changes the category, and verifies the title and description remain intact while the category-specific fields are empty.

**Acceptance Scenarios**:

1. **Given** a submitter has typed a title and description and has selected "Technical Innovation" with its fields filled, **When** they change the category to "Process Improvement", **Then** the title and description retain their values; the previously visible Technical Innovation fields are no longer shown; the new Process Improvement fields appear empty.
2. **Given** a submitter has typed a title and description but has not filled any category-specific fields, **When** they change the category multiple times, **Then** the title and description remain intact after every change.
3. **Given** a submitter has filled title, description, and category-specific fields and then submits the idea successfully, **When** the form resets, **Then** all fields — shared and category-specific — are cleared.

---

### Edge Cases

- What happens when a submitter submits the form with category-specific fields left empty? The category-specific fields are optional; the form MUST submit successfully as long as the shared required fields (title, description, category) are valid. The submitted idea stores empty/null values for unfilled category-specific fields.
- What happens if the category-specific field values exceed their character limits? The system MUST reject the submission and return a structured error response `{ errors: { fieldName: "message" } }`; the form MUST display each violation inline next to the offending field while preserving all other field values (shared and non-offending category-specific fields) in the form.
- What happens when a submitter uses the browser back button after a submission? The form MUST display in its empty initial state (no pre-filled values from the previous submission); the previously submitted idea is unaffected.
- What happens if a submitter has JavaScript disabled in their browser? Category-specific fields and guidance text rely on client-side interactivity. The form MUST still function for a basic submission (shared fields only) and MUST NOT error or break the page; a non-JavaScript fallback shows all possible fields at once with a static note indicating the fields relevant to the selected category.
- What happens when a submitter submits an idea and the category-specific fields contain content, but the category is then changed to "Other" before submitting? Only the visible category-specific field values (those for "Other") are sent; fields from previously selected categories are discarded.

---

## Clarifications

### Session 2026-05-13

- Q: What is the storage shape for category-specific field data? → A: Separate `idea_category_data` table — one row per idea; a single `fields` column stores the key→value map as JSON.
- Q: How does the server communicate category-specific field validation errors to the client? → A: Field-level inline errors — server returns `{ errors: { fieldName: "message" } }`; each field displays its error inline next to the offending input, matching the Phase 1 validation error pattern.
- Q: Is the admin idea detail view updated in Phase 2 to show stored category-specific data? → A: Yes — a read-only "Category Details" section is appended below the existing idea fields in the admin detail view, showing each submitted field name and value as a labelled pair; no new screen required.
- Q: What ARIA live region attributes are required for dynamically revealed fields and guidance text? → A: `aria-live="polite"` + `role="status"` on both the guidance text container and the dynamic fields container — non-interrupting announcement after category selection; `role="alert"` / `assertive` is reserved for validation errors.
- Q: Should category-specific text area fields display a live character counter? → A: Yes — a live remaining-character counter MUST be shown beneath each category-specific text area (consistent with the Phase 1 description field behaviour); text input fields (max 100 chars) do not require a counter.

---

## Requirements *(mandatory)*

### Functional Requirements

**Dynamic Fields**

- **FR-001**: When an authenticated submitter selects a category on the idea submission form, the system MUST immediately display the set of category-specific input fields defined for that category, without a full page reload.
- **FR-002**: When a submitter changes the selected category, the system MUST hide and clear the fields from the previously selected category and display the fields for the newly selected category.
- **FR-003**: Category-specific fields MUST be optional; their absence MUST NOT prevent a valid submission (shared required fields satisfied).
- **FR-004**: Category-specific fields MUST enforce the following per-field character limits, validated both client-side and server-side: text inputs max 100 characters; text area inputs max 500 characters. Each category-specific text area MUST display a live remaining-character counter beneath the field (consistent with the Phase 1 description field), updated on every keystroke. When the server rejects a submission due to exceeded limits, it MUST return a structured error response `{ errors: { fieldName: "message" } }`; the form MUST display each error message inline next to the offending field while preserving all other field values.
- **FR-005**: The category "Other" MUST display no additional input fields beyond the shared fields.
- **FR-006**: When the category is changed, all values entered in the previously visible category-specific fields MUST be cleared; shared field values (title, description) MUST be preserved.
- **FR-007**: On a successful submission, the values from all visible category-specific fields MUST be persisted alongside the core idea data and be retrievable for display in both the submitter's idea detail view and the admin idea detail view.

**Category-Specific Field Definitions**

- **FR-008**: For category "Technical Innovation", the form MUST display: (a) "Technology Area" — a dropdown with options: Frontend, Backend, Infrastructure, Data / AI, Security, Other; (b) "Estimated Effort" — a dropdown with options: Days, Weeks, Months.
- **FR-009**: For category "Process Improvement", the form MUST display: (a) "Affected Team / Department" — a text input, max 100 characters; (b) "Current Pain Point" — a text area, max 500 characters.
- **FR-010**: For category "Client Solution", the form MUST display: (a) "Target Client Segment" — a text input, max 100 characters; (b) "Client Problem Statement" — a text area, max 500 characters.
- **FR-011**: For category "Product Enhancement", the form MUST display: (a) "Affected Product / Feature" — a text input, max 100 characters; (b) "Proposed User Benefit" — a text area, max 500 characters.

**Guidance Text**

- **FR-012**: When a submitter selects a category, the system MUST display the guidance text defined for that category in a visually distinct area on the form.
- **FR-013**: Guidance text MUST be replaced when the submitter changes category; no guidance text MUST be shown before a category is selected.
- **FR-014**: The guidance text for each category MUST be:
  - "Technical Innovation": "Describe the technical problem this solves, the proposed approach, and the expected measurable improvement."
  - "Process Improvement": "Explain the current inefficiency, who is affected, and how this idea would improve the situation."
  - "Client Solution": "Describe the client's challenge clearly and explain how this idea addresses their pain point and the value it delivers."
  - "Product Enhancement": "Describe the current limitation and how this enhancement would improve the user experience or product capability."
  - "Other": "Please provide as much detail as possible to help evaluators understand and assess your idea."

**Admin Display**

- **FR-017**: The admin idea detail view MUST display a read-only "Category Details" section appended below the existing idea fields; this section MUST show each submitted category-specific field as a labelled name / value pair. Fields that were left empty by the submitter MUST NOT be shown. If no category-specific fields were submitted, the "Category Details" section MUST NOT be rendered.

- **FR-015**: Category-specific fields and guidance text MUST be accessible to screen readers; the guidance text container and the dynamic fields container MUST each carry `aria-live="polite"` and `role="status"` so that dynamically revealed content is announced after the user finishes their current interaction, without interrupting speech in progress. Validation error messages MUST use `role="alert"` (assertive) to ensure immediate announcement.
- **FR-016**: The submission form MUST remain functional for basic submission (shared fields only) when client-side interactivity is unavailable (progressive enhancement); in this fallback state all possible category-specific fields MUST be rendered with a visible label indicating which category each belongs to.

### Key Entities

- **CategoryFieldDefinition**: Category identifier, ordered list of field definitions (field name, field type — dropdown/text/textarea, allowed options for dropdowns, character limit for text inputs, display label, placeholder text).
- **CategoryGuidance**: Category identifier, guidance text string.
- **IdeaCategoryData**: Idea reference, category identifier, `fields` — a JSON column storing a key→value map of field-name to submitted value (nullable per field). Stored in a separate `idea_category_data` table (one row per idea); no category-specific columns are added to the core `ideas` table.

---

## Testing Strategy *(mandatory — aligned with Constitution v1.4.1, Principles IV–XI)*

All implementation MUST follow the RED-GREEN-REFACTOR cycle. Tests are written BEFORE implementation code; test expectations derive from the acceptance scenarios above, not from the implementation.

### Test Layer Breakdown

#### Unit Tests (`tests/unit/`)

| Source module (expected path) | Test file | What is verified |
|---|---|---|
| `src/lib/ideas/categoryFieldConfig.ts` | `tests/unit/lib/ideas/categoryFieldConfig.test.ts` | Returns correct field definitions for each category; "Other" returns empty array; unknown category throws |
| `src/lib/ideas/categoryGuidanceConfig.ts` | `tests/unit/lib/ideas/categoryGuidanceConfig.test.ts` | Returns correct guidance string for each category; no-selection returns null/empty; unknown category throws |
| `src/lib/ideas/ideaValidator.ts` (extended) | `tests/unit/lib/ideas/ideaValidator.test.ts` | Category-specific field character limits enforced; optional fields absent does not fail validation; fields from wrong category are ignored |

#### Integration Tests (`tests/integration/`)

| Feature domain | Test file | What is verified |
|---|---|---|
| `tests/integration/ideas/submit.test.ts` (extended) | Idea submission with category data | Category-specific field values are persisted alongside core idea (FR-007); server rejects values exceeding character limits (FR-004); missing optional fields do not block submission (FR-003) |
| `tests/integration/ideas/list.test.ts` (extended) | Idea detail retrieval | Stored category-specific values are returned in idea detail response (FR-007) |

#### E2E Tests (`tests/e2e/`)

| User journey | Playwright spec file | Scope |
|---|---|---|
| Category fields appear dynamically | `tests/e2e/ideas/submitter-sees-dynamic-fields.spec.ts` | Select each category → correct fields and guidance appear; change category → previous fields cleared, shared fields preserved; submit with optional fields empty → succeeds |

### Quality Gates (Constitution Principles V & X)

| Gate | Target | Enforcement |
|---|---|---|
| Line coverage | ≥ 80% | `jest.config.ts` → `coverageThreshold`; blocks CI on failure |
| Branch coverage | ≥ 75% | Same |
| Mutation score | ≥ 75% | `stryker run` on `main` push |
| Unit test runtime | < 1 s per test | Jest `--verbose` reviewed in PR |
| Integration test runtime | < 5 s per test | Same |
| Tautological assertions | 0 | `eslint-plugin-jest` (`jest/valid-expect`) at lint time |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After selecting a category, category-specific fields and guidance text appear within 200 milliseconds on a standard broadband connection — users perceive the response as instantaneous.
- **SC-002**: 85% of submitters who fill in at least one category-specific field produce an idea that evaluators rate as "sufficient detail to evaluate" without requesting further information, up from a Phase 1 baseline to be measured.
- **SC-003**: A submitter can select a category, read the guidance, fill in all visible category-specific fields, and submit the idea within the Phase 1 target of 5 minutes total for the full end-to-end submission flow.
- **SC-004**: Zero data loss occurs in the shared fields (title, description) when a submitter switches category at any point before submission.
- **SC-005**: The dynamic form meets WCAG 2.1 AA: all dynamically revealed content is announced correctly by a screen reader; all interactive elements have a visible focus indicator at all viewport widths (≥ 320px mobile, ≥ 768px tablet, ≥ 1280px desktop).
- **SC-006**: The form remains fully submittable (shared fields only) in a JavaScript-disabled environment, ensuring no submitter is blocked from using the portal.

---

## Assumptions

- The predefined category list from Phase 1 (Technical Innovation, Process Improvement, Client Solution, Product Enhancement, Other) is fixed; no new categories are added in Phase 2.
- Category-specific fields are optional additional context; they do not replace or modify the Phase 1 required fields (title, description, category).
- The idea detail view in the admin evaluation dashboard MUST display stored category-specific field values as a read-only "Category Details" section below the existing idea fields (FR-017); only fields with non-empty submitted values are shown.
- Evaluators (admins) can see the category-specific field values submitted for each idea, but cannot edit them; editing is out of scope for Phase 2.
- No machine-learning or AI-driven field suggestion is in scope; all guidance text and field definitions are static, configured at build time.
- Existing Phase 1 unit and integration tests for `ideaValidator.ts` are extended, not replaced; the Phase 1 validation rules remain unchanged.
- The non-JavaScript fallback rendering all fields simultaneously is an acceptable degraded experience; progressive enhancement is sufficient for Phase 2.
