# Feature Specification: Blind Review (Anonymous Evaluation)

**Feature Branch**: `006-blind-review`  
**Created**: 2026-05-14  
**Status**: Draft  
**Input**: User description: "Blind Review — admins cannot see the name of the persons who shared the idea. Evaluation mode needs to be Anonymous."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin Evaluates Idea Without Seeing Submitter Identity (Priority: P1)

An admin opens an idea in the Phase 1 evaluation view or the multi-stage pipeline review view. At no point during evaluation does the admin see the submitter's name, user ID, email address, or any other personal identifier. The idea is displayed with "Anonymous Submitter" (or equivalent neutral label) in place of the real identity. The admin reads the idea content, reviews attachments, and makes a decision — all without knowing who wrote it.

**Why this priority**: This is the core requirement. Without it, the "blind review" feature does not exist. Every other story depends on this being in place first.

**Independent Test**: An admin can log in, open any idea in both the list view and the detail/review view, and complete an accept, reject, or pipeline-advance action — all while a test assertion confirms that no real submitter name or user ID appears anywhere on the page.

**Acceptance Scenarios**:

1. **Given** an idea has been submitted by a user, **When** an admin opens the idea detail page (Phase 1 evaluation), **Then** the submitter's real name and user ID are not displayed anywhere on the page.
2. **Given** an idea is in a pipeline review stage, **When** an admin opens the pipeline review page, **Then** the submitter's real name, user ID, and email are not displayed anywhere on the page.
3. **Given** the admin views the admin ideas list, **When** the list renders any idea row or card, **Then** the submitter's real name is replaced with a neutral anonymous label.
4. **Given** an idea's stage transition history is displayed, **When** the admin reads the history panel, **Then** only admin reviewer names appear (admin identities are not anonymised); submitter identity does not appear.

---

### User Story 2 — Submitter Receives Decision Notification After Blind Evaluation (Priority: P2)

After an admin accepts, rejects, or advances an idea through the pipeline — all while blind to the submitter's identity — the system must still successfully notify the correct submitter of the outcome. The submitter's identity is preserved in the data store and used exclusively for backend notification dispatch; it is never surfaced to the admin UI.

**Why this priority**: Blind review is only viable if the system can still close the loop with the submitter. Without this, accepted and rejected submitters receive no feedback.

**Independent Test**: A submission can be accepted via the blind evaluation UI, and the test confirms that the submitter's stored identity is intact and that the notification pathway (email or in-app) correctly targets the right user — without the admin ever seeing that identity.

**Acceptance Scenarios**:

1. **Given** an admin accepts an idea without seeing the submitter's name, **When** the decision is saved, **Then** the system dispatches a notification to the actual submitter's contact address.
2. **Given** an admin rejects an idea, **When** the decision is saved, **Then** the submitter receives a rejection notification with any admin-provided comment.
3. **Given** the admin completes a pipeline stage transition, **When** the stage is saved, **Then** no submitter identity is written to any admin-facing log entry.

---

### User Story 3 — Audit Trail Preserves Full Identity for Compliance (Priority: P3)

System administrators or privileged backend roles can access a complete, non-anonymised audit trail that maps every idea to its submitter. This audit capability exists exclusively in the data layer and is not exposed through the standard admin UI. It satisfies compliance and dispute-resolution requirements without breaking blind review guarantees.

**Why this priority**: Regulatory or organisational compliance may require traceability. However, this capability must not break the anonymity of the evaluation experience for standard admins.

**Independent Test**: The submitter's identity is verifiably present in the data store after submission and unchanged after evaluation, while simultaneously being absent from every rendered admin page.

**Acceptance Scenarios**:

1. **Given** an idea has been reviewed and decided, **When** the raw data record is inspected, **Then** the submitter's user ID is present and correctly linked to the idea.
2. **Given** blind review is active, **When** a standard admin user accesses any idea-related UI, **Then** no UI path allows the admin to reveal the underlying submitter identity.

---

### Edge Cases

- What happens if the idea's title or description contains the submitter's own name typed by the user? (Content filtering is out of scope for v1; only system-generated identity fields are anonymised.)
- What if an attachment filename contains the submitter's name? (Out of scope for v1; filenames are displayed as submitted.)
- What happens when an admin searches or filters ideas by submitter? (Any submitter-based filter in the admin list must be removed or disabled while blind review is active.)
- What if a user is both a submitter and an admin? (The admin sees their own idea anonymised the same as any other idea.)
- Can an admin toggle blind review off on a per-idea or per-session basis? (No — blind review is a system-wide policy in v1; there is no per-idea or per-session toggle.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST hide the submitter's name, user ID, email, and any other personally identifying attribute from all admin-facing idea views while an idea is under evaluation.
- **FR-002**: System MUST display a neutral anonymous label (e.g., "Anonymous Submitter") in every location where the submitter's identity would otherwise appear in an admin view.
- **FR-003**: Blind review MUST apply consistently across all admin surfaces: the idea list, the Phase 1 evaluation detail page, and all multi-stage pipeline review pages.
- **FR-004**: System MUST preserve the submitter's identity in persistent storage unchanged; anonymisation is a display-layer concern only and MUST NOT alter stored data.
- **FR-005**: System MUST continue to use the stored submitter identity to dispatch notifications (acceptance, rejection, clarification requests, stage updates) to the correct recipient.
- **FR-006**: Admin-facing stage transition history and audit logs MUST NOT include the submitter's identity; only the admin reviewer's identity appears in history entries.
- **FR-007**: Any admin-facing filter, sort, or search capability that would expose submitter identity (e.g., "filter by submitter name") MUST be removed or disabled while blind review is active.
- **FR-008**: Blind review anonymisation MUST remain in effect throughout the full evaluation lifecycle: from initial submission through Phase 1 evaluation, all pipeline stages, and up to final decision.
- **FR-009**: The system MUST NOT expose submitter identity through indirect channels in the admin UI, including but not limited to: URL parameters containing user IDs, tooltip text, aria-label attributes, and HTML source visible to the admin.

### Key Entities

- **Idea**: The submitted idea record. Contains a `submitterId` field (user ID) that MUST be present in storage but MUST NOT be rendered in admin-facing views.
- **Submitter**: The user who created the idea. Their identity (name, ID, email) is stored server-side and used only for notification dispatch; it is never transmitted to the admin client during evaluation.
- **Admin**: The reviewing user. Sees idea content but not submitter identity. Admin identity is not anonymised — admins are identified in history/audit entries.
- **Stage Transition**: A history entry recording which admin performed a pipeline action. Must not contain submitter identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of admin-facing idea views (list, Phase 1 detail, pipeline review, stage history) render without any real submitter name, user ID, or email visible to the admin user.
- **SC-002**: All existing submitter notifications (acceptance, rejection, clarification) continue to reach the correct recipient after blind review is applied — zero notification delivery regressions.
- **SC-003**: The submitter's identity remains intact in the data store for every idea before and after evaluation, with no data loss.
- **SC-004**: No new admin-facing API endpoints or UI routes expose submitter identity; automated tests confirm the absence of identity leakage in all rendered admin views.
- **SC-005**: Admins can complete a full evaluation (accept, reject, or full pipeline advance to final decision) in the same number of steps as before blind review was introduced — no additional friction added to the evaluation workflow.

## Assumptions

- Only system-generated identity fields (name, user ID, email) are anonymised. Idea content (title, description, attachments, category fields) is displayed as submitted, even if the submitter included their own name within the text.
- Blind review is a system-wide, always-on policy in v1. There is no admin setting, per-idea toggle, or role-based override to reveal identity during evaluation.
- Submitter identity may be revealed to the submitter themselves on their own idea detail page; only the admin view is anonymised.
- The notification system (however implemented) has access to server-side submitter data and does not require the admin UI to surface it.
- A "super admin" or database-level audit capability is out of scope for this feature; the requirement is only that the data is preserved, not that a special UI exists to access it.
- The existing Phase 5 multi-stage pipeline review pages are in scope for this feature (they currently display `idea.submitterId` and must be updated).
- Performance: anonymisation at the display layer adds negligible latency; no caching changes are needed.
