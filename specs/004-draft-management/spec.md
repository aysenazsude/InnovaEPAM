# Feature Specification: Draft Management — Phase 4

**Feature Branch**: `004-draft-management`
**Created**: 2026-05-14
**Status**: Draft
**Scope**: Phase 4 — Save, resume, and delete idea drafts before final submission

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Save Idea as Draft (Priority: P1)

An authenticated submitter is filling in the idea submission form and wants to preserve their progress without submitting the idea yet. They activate a "Save Draft" action on the form, and the system saves all currently visible field values — including title, description, category, category-specific fields, and any attached files — as a named draft associated with their account. The submitter is informed the draft was saved successfully and may safely navigate away.

**Why this priority**: Saving a draft is the foundational capability of this feature. Without it, no other draft story can exist. It is also the highest-value behaviour for submitters who need to pause mid-way through a detailed idea entry without losing their work.

**Independent Test**: A tester logs in, partially fills the submission form (title and description only), activates "Save Draft", navigates away, and verifies a new draft entry appears in their drafts list with the correct title and last-saved timestamp — without any idea appearing in the submitted ideas list.

**Acceptance Scenarios**:

1. **Given** an authenticated submitter has entered a title and description on the submission form, **When** they activate "Save Draft", **Then** a draft is created, the submitter sees a success confirmation, and no idea appears in the submitted ideas list.
2. **Given** a submitter activates "Save Draft" without entering a title, **When** the save is processed, **Then** the draft is saved with a placeholder name (e.g., "Untitled Draft") and a success confirmation is shown.
3. **Given** a submitter has selected a category and filled in category-specific fields before saving, **When** the draft is saved, **Then** the category selection and all category-specific field values are persisted with the draft.
4. **Given** a submitter has attached one or more files before saving, **When** the draft is saved, **Then** all attached files are persisted with the draft and remain associated with it.
5. **Given** a submitter activates "Save Draft" and a network or server error occurs, **When** the error is received, **Then** the form remains unchanged, a clear error message is shown, and the submitter's input is not lost.
6. **Given** a submitter is on the submission form with no content entered, **When** they activate "Save Draft", **Then** the system saves an empty draft and confirms success.

---

### User Story 2 — View and Resume a Saved Draft (Priority: P2)

An authenticated submitter returns to the portal in a later session. They navigate to their drafts list, see all previously saved drafts with their titles and last-saved timestamps, and select one to continue editing. The submission form reopens with all previously saved field values and attachments restored exactly as they were when the draft was last saved.

**Why this priority**: Resuming a draft is the natural continuation of saving one. Without this, saving drafts provides no practical value. Together, US1 and US2 form the complete save-and-continue workflow that is the core promise of this feature.

**Independent Test**: A tester saves a draft with a title, description, and one attached image, ends their session, logs in again, opens the drafts list, selects the draft, and verifies the form is pre-filled with the original title, description, and attachment — ready to continue editing.

**Acceptance Scenarios**:

1. **Given** an authenticated submitter navigates to their drafts list, **When** the page loads, **Then** all their drafts are listed; each entry shows the draft title (or "Untitled Draft"), the date and time of the last save, and a "Continue" action.
2. **Given** a submitter has no saved drafts, **When** they view the drafts list, **Then** an empty-state message is shown (e.g., "You have no saved drafts.") with a prompt to start a new idea.
3. **Given** a submitter selects "Continue" on a draft, **When** the form loads, **Then** all field values saved in the draft — title, description, category, category-specific fields, and attachments — are pre-filled in the form exactly as they were saved.
4. **Given** a submitter opens a draft that was saved without a category selection, **When** the form loads, **Then** the category field is empty and no category-specific fields are shown, consistent with the Phase 2 behaviour for an unselected category.
5. **Given** a submitter opens a draft and makes changes, **When** they activate "Save Draft" again, **Then** the existing draft is updated with the new values; no duplicate draft is created; the last-saved timestamp is updated.
6. **Given** a submitter opens a draft, makes changes, and navigates away without saving, **When** they return to the drafts list, **Then** the draft still holds the values from the last explicit save, not the unsaved changes.
7. **Given** a submitter's draft has attachments, **When** they resume the draft, **Then** each previously attached file is shown in the attachment area with its preview (thumbnail for images, player for videos, file-type icon for documents), consistent with Phase 3 behaviour.

---

### User Story 3 — Submit a Draft as a Final Idea (Priority: P3)

A submitter who has resumed a draft and is satisfied with it submits it as a final idea from within the editing form. The system validates the form exactly as it does for a direct new submission, persists the idea (with all field values and attachments), and removes the draft. The submitted idea is immediately visible in the standard submitted ideas list.

**Why this priority**: Submission is the terminal action that converts a draft into a real idea. Without it, drafts would be a dead end. This story completes the entire draft lifecycle and delivers the full user value of the feature.

**Independent Test**: A tester resumes a draft, completes all required fields, activates "Submit", and verifies: (a) the submitted idea appears in the ideas list with all expected field values and attachments, and (b) the draft no longer appears in the drafts list.

**Acceptance Scenarios**:

1. **Given** a submitter has opened a draft with all required fields filled, **When** they activate "Submit", **Then** the idea is created, the draft is deleted, and the submitter is redirected to their idea list with a success confirmation.
2. **Given** a submitter activates "Submit" from a draft with a missing required field (e.g., title), **When** the validation runs, **Then** the system displays inline validation errors, the draft is not deleted, and the submitter may correct the form and re-submit.
3. **Given** a submitted idea was originally a draft with attachments, **When** an admin views the idea detail, **Then** all attachments from the draft appear in the idea's attachment section exactly as they would for a directly submitted idea.
4. **Given** a submitter submits a draft, **When** the submission succeeds, **Then** the draft no longer appears in the submitter's drafts list.
5. **Given** a submitter is on an open draft form, **When** they activate "Submit" and a server error occurs, **Then** the submission fails gracefully, the draft is not deleted, an error message is displayed, and the form remains open with all values intact.

---

### User Story 4 — Delete a Draft (Priority: P4)

A submitter no longer needs a saved draft and wants to remove it permanently. They activate a "Delete" action on a draft entry in their drafts list. After confirming the deletion, the draft is permanently removed and no longer appears in the list.

**Why this priority**: Draft deletion is a housekeeping capability that keeps the drafts list manageable. It is lower priority because the product remains usable without it, but it is necessary to prevent drafts from accumulating indefinitely and creating a confusing list.

**Independent Test**: A tester saves two drafts, deletes one via the drafts list, and verifies only the remaining draft appears in the list and that the deleted draft cannot be recovered by navigating directly to its URL.

**Acceptance Scenarios**:

1. **Given** a submitter activates "Delete" on a draft entry, **When** the action is triggered, **Then** a confirmation prompt asks the submitter to confirm permanent deletion before proceeding.
2. **Given** a submitter confirms the deletion, **When** the deletion is processed, **Then** the draft is permanently removed and no longer appears in the drafts list; a brief success confirmation is shown.
3. **Given** a submitter dismisses the deletion confirmation, **When** the prompt is closed, **Then** the draft remains in the list unchanged.
4. **Given** a submitter deletes a draft that had attachments, **When** the deletion is processed, **Then** all files associated with the draft are also removed from storage; they do not appear in any list or remain accessible via direct URL.
5. **Given** a submitter has only one draft and deletes it, **When** the deletion succeeds, **Then** the drafts list transitions to the empty-state view (per US2 Scenario 2).

---

### Edge Cases

- **Session expiry during form entry**: If the submitter's session expires while they are filling the form, the draft is not auto-saved on expiry. When the submitter logs back in, the drafts list shows only previously explicitly saved drafts; any unsaved input entered after the last save is lost. A session-expiry warning MUST prompt the submitter to save before their session ends.
- **Attachment deleted from storage externally**: If a file attached to a draft is removed from storage by an admin or system process outside the normal flow, the draft MUST still load; the missing attachment MUST be shown as a broken/unavailable entry with a warning; the submitter may remove the broken entry and re-attach or continue without it.
- **Concurrent editing of the same draft**: If a submitter opens the same draft in two browser tabs and saves from both, the last save wins; the submitter in the older tab sees a warning that the draft has been updated elsewhere and their save may overwrite newer changes.
- **Maximum drafts per user**: A submitter MUST NOT be permitted to create more than 10 saved drafts simultaneously. When the limit is reached, "Save Draft" is disabled and a message explains the limit. The submitter must delete an existing draft before saving a new one.
- **Draft submitted in another tab**: If a submitter submits a draft in one tab and then attempts to save or submit it again in a second tab where the same draft is open, the second action MUST detect that the draft no longer exists, display an informative message, and prevent creating a duplicate idea.
- **Draft with only attachments (no text)**: A draft with no title, description, or category but with one or more attached files MUST be saved successfully; the draft appears in the list as "Untitled Draft".

---

## Requirements *(mandatory)*

### Functional Requirements

**Draft Creation & Persistence**

- **FR-001**: An authenticated submitter MUST be able to save the current state of the idea submission form as a draft at any point using a clearly labelled "Save Draft" action.
- **FR-002**: A draft MUST persist all form field values present at the time of saving: title, description, category selection, all visible category-specific field values (per Phase 2), and all attached files (per Phase 3).
- **FR-003**: A draft MUST be associated exclusively with the authenticated submitter who created it; no other submitter or admin MUST be able to view, edit, or access another user's drafts.
- **FR-004**: Saving a draft MUST NOT create an idea entry; drafts MUST be stored separately from submitted ideas and MUST NOT appear in any idea listing (submitter or admin views).
- **FR-005**: A draft saved without a title MUST be stored with a system-generated placeholder name ("Untitled Draft"). The placeholder MUST be editable when the submitter resumes the draft.
- **FR-006**: A submitter MUST NOT hold more than 10 saved drafts at any time. When the limit is reached, the "Save Draft" action MUST be disabled and an informative message displayed. Existing drafts MUST be deletable to free up capacity.
- **FR-007**: Each draft MUST record the date and time of its most recent save.

**Draft Listing**

- **FR-008**: The system MUST provide a dedicated drafts view accessible to authenticated submitters that lists all their saved drafts.
- **FR-009**: Each entry in the drafts list MUST display: draft title (or "Untitled Draft"), date and time of last save, and "Continue" and "Delete" actions.
- **FR-010**: When a submitter has no drafts, the drafts list MUST display an empty-state message and a prompt to start a new idea.

**Draft Resumption**

- **FR-011**: When a submitter selects "Continue" on a draft, the idea submission form MUST open with all saved field values pre-filled, including all attached files shown with their previews consistent with Phase 3 display rules.
- **FR-012**: Resuming a draft that was saved with no category selection MUST result in the category field being empty with no category-specific fields visible.
- **FR-013**: All edits made after resuming a draft MUST be saved by explicitly activating "Save Draft"; the system MUST NOT auto-save silently in the background without a visible indicator.
- **FR-014**: Re-saving an already-saved draft MUST update the existing draft record; no duplicate draft MUST be created.

**Draft Submission**

- **FR-015**: A submitter MUST be able to submit a draft as a final idea directly from the draft editing form using the same "Submit" action available in the standard submission flow.
- **FR-016**: Submitting a draft MUST apply the same validation rules as a direct submission (required fields, character limits, attachment constraints from Phase 2 and Phase 3).
- **FR-017**: Upon successful submission of a draft, the draft record MUST be permanently deleted and the resulting idea MUST appear in the standard submitted ideas list.
- **FR-018**: If submission fails (validation errors or server error), the draft MUST NOT be deleted and the form MUST remain open with all values intact.

**Draft Deletion**

- **FR-019**: A submitter MUST be able to permanently delete any of their drafts from the drafts list.
- **FR-020**: Before a draft is permanently deleted, the system MUST present a confirmation step that the submitter must explicitly confirm.
- **FR-021**: When a draft with attached files is deleted, all associated files MUST also be removed from storage.

**Access Control**

- **FR-022**: Drafts MUST only be accessible to the submitter who owns them. Any attempt to access another user's draft (e.g., via direct URL) MUST result in a "not found" response.
- **FR-023**: Admin users MUST NOT be able to view, list, or act on any submitter's drafts.

### Key Entities

- **Draft**: A partially-completed idea owned by a submitter. Key attributes: unique identifier, owner (submitter), title (nullable, defaults to "Untitled Draft"), description (nullable), category (nullable), category-specific field values (nullable map), list of attached file references, created timestamp, last-saved timestamp.
- **Attached File (on Draft)**: A file uploaded and associated with a draft. Same attributes as a Phase 3 attachment but linked to a draft record rather than a submitted idea. Files are promoted to the idea's attachment list upon draft submission.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Submitters can save a draft and successfully resume it in a later session with all field values and attachments intact — 100% of saved content is restored with no data loss.
- **SC-002**: The time from activating "Save Draft" to receiving a success confirmation is under 3 seconds under normal load conditions.
- **SC-003**: A submitter can complete the full draft lifecycle (save → resume → edit → submit) without leaving the portal or performing more than 5 navigation actions.
- **SC-004**: The drafts list loads and becomes interactive in under 2 seconds for a submitter with up to 10 saved drafts.
- **SC-005**: Zero cases of a draft being accessible to a user other than its owner or appearing in any idea listing before explicit submission.
- **SC-006**: Deleting a draft with attachments leaves no orphaned files in storage — 100% of associated files are removed within the same operation.

---

## Assumptions

- **A-001**: Drafts are stored server-side, not only in the browser. This ensures persistence across devices and sessions.
- **A-002**: Auto-save (background periodic saving without explicit user action) is out of scope for this phase. Only explicit "Save Draft" actions save progress. A future enhancement may add auto-save.
- **A-003**: The 10-draft limit per user is sufficient for the expected user population and usage patterns of the innovaEPAM portal. This may be revisited based on usage data after release.
- **A-004**: Drafts are retained indefinitely until the submitter deletes them or submits them as ideas. No automatic expiry is applied in this phase.
- **A-005**: Attachment files associated with a draft occupy the same storage as submitted idea attachments and are subject to the same per-file size (≤10 MB) and count (≤3 per draft) limits defined in Phase 3.
- **A-006**: The "Continue" action navigates to the same idea submission form used in Phases 2–3, pre-populated with draft values. No separate "draft editing" form is introduced.
- **A-007**: Admins have no visibility into or actions over drafts; their workflows are unaffected by this feature.
