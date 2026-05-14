# Feature Specification: Multi-Stage Review — Phase 5

**Feature Branch**: `005-multi-stage-review`
**Created**: 2026-05-14
**Status**: Draft
**Scope**: Phase 5 — 4-stage structured evaluation pipeline for submitted ideas

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin Advances an Idea Through Review Stages (Priority: P1)

An admin opens a submitted idea and guides it through a structured 4-stage review pipeline: **Screening → Technical Review → Business Review → Final Decision**. At each stage the admin records mandatory written notes, then either advances the idea to the next stage or rejects it with a documented reason. At the Final Decision stage the admin explicitly marks the outcome as Approved or Rejected.

**Why this priority**: The stage-transition capability is the backbone of the entire pipeline. Without it, none of the other user stories (visibility, feedback, filtering) have data to work with. Every other story depends on stage transitions existing in the system.

**Independent Test**: A tester logs in as an admin, opens a submitted idea, advances it stage by stage providing notes at each step, and at the Final Decision stage marks it Approved. The tester verifies: (a) the idea's current stage is correct at each step, (b) notes are persisted after each transition, and (c) the final status is "Approved" on both the admin dashboard and the submitter's idea detail page.

**Acceptance Scenarios**:

1. **Given** an admin opens an idea in the "Submitted" state, **When** they view the idea detail, **Then** the first stage (Screening) is indicated as the active stage and the admin sees a form to enter screening notes and two actions: "Advance to Technical Review" and "Reject".
2. **Given** an admin has entered Screening notes and clicks "Advance to Technical Review", **When** the transition is processed, **Then** the idea moves to the Technical Review stage, the screening notes are saved with the reviewer's name and timestamp, and the action cannot be repeated (stage is locked).
3. **Given** an admin has completed Technical Review and Business Review, **When** they reach Final Decision, **Then** the actions presented are "Approve" and "Reject" (not "Advance"), and mandatory notes are still required before either action.
4. **Given** an admin attempts to advance an idea without entering notes, **When** they click the advance or approve action, **Then** the system prevents the transition and highlights the notes field as required.
5. **Given** an admin clicks "Reject" at any stage and enters a rejection reason, **When** the rejection is confirmed, **Then** the idea status changes to "Rejected", the rejection reason and stage-at-rejection are recorded, and no further stage actions are available.
6. **Given** an idea is at the Screening stage and one admin begins entering notes, **When** a second admin attempts to submit a transition for the same idea, **Then** the second admin's submission is blocked with a conflict error (first write wins).

---

### User Story 2 — Submitter Tracks Review Progress (Priority: P2)

An authenticated submitter opens one of their submitted ideas and sees exactly which review stage it is currently in, along with a visual progress indicator showing all 4 stages. When stages are complete, the submitter can read the reviewer's notes from each completed stage. If the idea was rejected, the submitter sees the stage at which rejection occurred and the documented reason.

**Why this priority**: Transparency builds trust in the innovation process. Submitters who cannot see where their idea stands lose confidence in the portal. This story requires only read access to stage data already created by US1, making it achievable immediately after US1.

**Independent Test**: A tester logs in as a submitter whose idea has been advanced to Technical Review by an admin. The tester opens the idea detail page and verifies: (a) "Technical Review" is shown as the active stage, (b) a progress indicator shows Stage 1 as complete and Stage 2 as active, and (c) the Screening notes from Stage 1 are readable.

**Acceptance Scenarios**:

1. **Given** a submitter opens an idea that has entered the review pipeline, **When** the idea detail page loads, **Then** a pipeline progress indicator is shown displaying all 4 stage names with the current stage clearly highlighted.
2. **Given** a submitter's idea has completed one or more stages, **When** they view the idea detail, **Then** the notes recorded by the reviewer at each completed stage are visible with the reviewer's name and the completion date.
3. **Given** a submitter's idea was rejected at Stage 2 (Technical Review), **When** they view the idea detail, **Then** the rejection is displayed with the stage name ("Rejected at Technical Review"), the rejection reason, and the reviewer's name and date.
4. **Given** a submitter's idea reaches the Final Decision stage and is Approved, **When** they view the idea detail, **Then** the status shows "Approved" and all 4 stage notes are visible.
5. **Given** a submitter's idea is still at Stage 1 (Screening), **When** they view the idea detail, **Then** stages 2, 3, and 4 are shown as pending and no notes are displayed for those future stages.

---

### User Story 3 — Admin Filters and Monitors Ideas by Stage (Priority: P3)

An admin opens the evaluation dashboard and can filter the ideas list to show only ideas at a specific review stage (e.g., "show all ideas currently in Technical Review"). The dashboard also shows a summary count of how many ideas are at each stage, giving the admin situational awareness of pipeline load.

**Why this priority**: As the number of ideas in the pipeline grows, admins need to efficiently triage their workload. Filtering by stage prevents them from having to scroll through all ideas to find the ones requiring action at their current focus area.

**Independent Test**: A tester logs in as an admin after multiple ideas have been advanced to different stages. The tester applies the "Business Review" stage filter and verifies only ideas currently in Business Review are shown. The tester then checks the pipeline summary and verifies the counts match the number of ideas at each stage.

**Acceptance Scenarios**:

1. **Given** an admin is on the evaluation dashboard, **When** the page loads, **Then** a pipeline summary bar shows the count of ideas at each of the 4 stages plus the count of recently Approved and Rejected ideas.
2. **Given** an admin selects a stage filter (e.g., "Technical Review"), **When** the filter is applied, **Then** the idea list shows only ideas currently at that stage and the active filter is visually indicated.
3. **Given** an admin clears the stage filter, **When** the list refreshes, **Then** ideas at all active stages are shown (default view).
4. **Given** no ideas are currently at a selected stage, **When** the filter is applied, **Then** an empty-state message informs the admin that no ideas are awaiting review at that stage.
5. **Given** an admin applies a stage filter and then opens an idea to review it, **When** they return to the dashboard, **Then** the previously selected filter is still active.

---

### User Story 4 — Submitter Responds to a Clarification Request (Priority: P4)

During any review stage, an admin may mark the idea as "Awaiting Clarification" and describe what additional information is needed. The submitter receives a notification on the idea detail page, provides the requested clarification as a text response, and the idea returns to the active stage for the admin to continue their review.

**Why this priority**: Real-world evaluations often require back-and-forth dialogue. This story prevents bottlenecks caused by incomplete submissions. It is lower priority than the core pipeline because the pipeline delivers value even when clarifications are handled informally.

**Independent Test**: A tester (admin) opens an idea in Technical Review, marks it "Awaiting Clarification" with a question. The tester (submitter) logs in, sees the clarification request on their idea, submits a text response. The tester (admin) logs back in and verifies the idea is back in Technical Review with the submitter's response visible.

**Acceptance Scenarios**:

1. **Given** an admin is reviewing an idea at any stage, **When** they mark it "Awaiting Clarification" with a mandatory question, **Then** the idea status changes to "Awaiting Clarification", the stage clock is paused, and the question is displayed to the submitter on the idea detail page.
2. **Given** a submitter opens an idea with status "Awaiting Clarification", **When** the page loads, **Then** the admin's question is prominently displayed and a text input is shown for the submitter's response.
3. **Given** a submitter enters a response and submits it, **When** the submission is processed, **Then** the idea status returns to the active review stage, the response is appended to the idea's stage history, and the admin sees the submitter's response when they open the idea.
4. **Given** an idea is in "Awaiting Clarification" state, **When** a submitter views the idea, **Then** they cannot submit the idea (the submit action is hidden or disabled) until the clarification is resolved.
5. **Given** an admin receives a submitter's clarification response, **When** they open the idea, **Then** the response is shown in the stage history and the admin can resume the stage review (advance or reject).

---

### Edge Cases

- What happens when an admin tries to advance an idea that another admin has simultaneously rejected? The second admin's action fails with a conflict error; the idea remains Rejected.
- What happens if an idea is in "Awaiting Clarification" for an extended period and the submitter never responds? An admin can manually cancel the clarification request at any time and resume the review without a submitter response. No automatic timeout or background job is required.
- What happens when a submitter views an idea that has not yet entered the review pipeline (still at "Submitted" status)? The pipeline progress indicator shows Stage 1 as pending with a message like "Your idea is queued for screening."
- What happens if an admin role is removed from a user who is mid-stage on a review? Any stage notes they partially entered are discarded; an active admin must restart that stage's review.
- What happens when a new admin logs in and all ideas are already past Screening? They can pick up any idea from its current stage.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support exactly 4 sequential, named review stages for every submitted idea: (1) Screening, (2) Technical Review, (3) Business Review, (4) Final Decision.
- **FR-002**: An admin MUST be able to advance an idea from its current stage to the next stage by recording mandatory stage notes.
- **FR-003**: An admin MUST be able to reject an idea at any stage by recording a mandatory rejection reason; rejection is a terminal state requiring no further stage action.
- **FR-004**: At the Final Decision stage, an admin MUST explicitly choose between "Approve" and "Reject" rather than a generic "Advance" action.
- **FR-005**: The system MUST prevent a stage transition when no notes have been provided; the notes field MUST be marked as required.
- **FR-006**: The system MUST record a complete audit trail for each stage transition, capturing: stage name, action taken (advanced / rejected / approved), reviewer identity, notes text, and timestamp.
- **FR-007**: The current review stage of an idea MUST be visible to the submitter of that idea in human-readable form (e.g., "Technical Review") on the idea detail page.
- **FR-008**: The system MUST display a pipeline progress indicator to submitters showing all 4 stage names with visual differentiation between completed, active, and pending stages.
- **FR-009**: A submitter MUST be able to read the stage notes from all completed stages of their own idea.
- **FR-010**: Admins MUST be able to filter the idea list by the current review stage.
- **FR-011**: The admin dashboard MUST display a count of ideas currently at each of the 4 stages.
- **FR-012**: An admin MUST be able to mark an idea as "Awaiting Clarification" at any stage and record a mandatory question for the submitter.
- **FR-013**: A submitter MUST be able to submit a text response to a clarification request; the response MUST be appended to the idea's stage history.
- **FR-014**: When an idea transitions out of "Awaiting Clarification" via a submitter's response, it MUST return to the stage it was at when the clarification was requested.
- **FR-015**: Each stage is a single-reviewer gate. One admin submits notes and triggers the stage transition (advance, approve, reject, or request clarification); the first submission locks that stage. A second admin who attempts to submit a transition for the same stage in the same state receives a conflict error.

### Key Entities

- **ReviewStage**: Represents one of the 4 named stages in the pipeline (Screening, Technical Review, Business Review, Final Decision).
- **StageTransition**: A recorded event capturing an idea's movement from one stage to the next (or to a terminal state), including actor, timestamp, notes, and outcome (advanced / approved / rejected / awaiting-clarification).
- **ClarificationRequest**: A question posed to a submitter by an admin during a stage, along with the submitter's response and resolution timestamp.
- **PipelineStatus**: The aggregate state of an idea in the pipeline, derived from its stage transitions: current stage, completion status, and whether clarification is pending.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can complete a single-stage review (open idea, read details, enter notes, advance) in under 3 minutes for a well-understood idea.
- **SC-002**: A submitter can identify the current review stage of any of their ideas within 10 seconds of arriving on the idea detail page.
- **SC-003**: 100% of stage transitions are recorded in the audit trail with no gaps; every accepted or rejected idea has a complete history covering all stages it passed through.
- **SC-004**: The admin dashboard pipeline summary updates to reflect the correct stage counts without a full page reload after a stage transition is processed.
- **SC-005**: Ideas awaiting clarification for more than 7 days are visually flagged on the admin dashboard to prevent silent pipeline stalls.
- **SC-006**: No idea can skip a stage; the system prevents direct transitions from Stage 1 to Stage 3 or later.

---

## Assumptions

- The 4 stage names (Screening, Technical Review, Business Review, Final Decision) are fixed for this phase; configurable stage names or counts are out of scope.
- All admins have equal permission to review ideas at any stage; stage-specific role restrictions are out of scope.
- Email or push notifications for stage transitions are out of scope; in-portal visibility is sufficient for Phase 5.
- The existing `IdeaStatus` enum will be extended or replaced to represent pipeline stages; backward compatibility with Phase 1 statuses (submitted, under_review, accepted, rejected) is a migration concern addressed in the plan phase.
- Ideas that were already "Accepted" or "Rejected" under the Phase 1 single-stage system are not retroactively entered into the 4-stage pipeline.
- The clarification request feature (US4) is limited to text; file attachments in clarification responses are out of scope.
- Performance requirements follow standard portal expectations (sub-2-second page loads) established in Phase 1.
