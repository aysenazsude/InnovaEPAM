# Feature Specification: Scoring System

**Feature Branch**: `007-scoring-system`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: User description: "now we are going to add phase 7. Scoring System which gives 1-5 rating dimensions for evaluations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Scores an Idea at a Pipeline Stage (Priority: P1)

When an admin advances or rejects an idea at any pipeline stage (Screening, Technical Review, Business Review, Final Decision), they can provide a numeric score from 1 to 5 for each of the fixed evaluation dimensions alongside their written notes. The scores are saved together with the stage transition record.

**Why this priority**: This is the core value of the feature. Without capturing per-stage dimension scores, nothing else in the scoring system functions. It directly enriches the structured data that admins produce at every review step.

**Independent Test**: A single admin logs in, opens a pipeline idea at the Screening stage, fills in dimension scores (1–5 each), submits, and the scores are persisted and visible on the review history.

**Acceptance Scenarios**:

1. **Given** an idea is at an active pipeline stage, **When** the admin opens the stage review form, **Then** a scoring panel with all evaluation dimensions is displayed, each with a 1–5 scale selector.
2. **Given** the admin has selected scores for all dimensions, **When** they submit the stage action (advance or reject), **Then** the scores are saved alongside the stage transition notes.
3. **Given** the admin has not selected a score for one or more dimensions, **When** they submit, **Then** the system accepts the submission (scoring is advisory, not mandatory).
4. **Given** a score of 0 or 6 is entered, **When** the admin attempts to submit, **Then** the system rejects the input with a validation message.

---

### User Story 2 - Admin Views Score Summary for an Idea (Priority: P2)

On the pipeline review page for a specific idea, the admin can see a score summary panel showing all dimension scores recorded at each stage, as well as the overall average across all stages and dimensions. This helps the admin understand the accumulated evaluation quality before making the final decision.

**Why this priority**: Score capture is only useful if admins can see the aggregated picture. The summary directly supports the Final Decision stage by providing an evidence-based reference.

**Independent Test**: An admin opens the pipeline review page of an idea that has been scored at at least one stage and sees a score breakdown table with per-stage and overall averages.

**Acceptance Scenarios**:

1. **Given** an idea has scores recorded at one or more pipeline stages, **When** an admin opens the pipeline review page, **Then** a score summary panel shows each stage's scores by dimension and a computed average per stage.
2. **Given** the score summary is displayed, **When** the admin reads the overall average, **Then** the value is a single number rounded to one decimal place representing the mean of all recorded dimension scores.
3. **Given** an idea has no scores recorded yet, **When** the admin opens the pipeline review page, **Then** the score summary panel shows a message indicating no scores have been recorded.

---

### User Story 3 - Admin Dashboard Shows Aggregate Score for Each Idea (Priority: P3)

In the admin idea list, each idea that has entered the pipeline displays its current aggregate score (overall average) so admins can compare ideas at a glance without opening individual review pages.

**Why this priority**: Comparative visibility across ideas is a convenience feature that builds on P1 and P2. It is valuable but not blocking — the core scoring workflow functions without it.

**Independent Test**: The admin dashboard loads and shows a score badge or numeric value next to pipeline ideas that have been scored; ideas with no scores show no badge.

**Acceptance Scenarios**:

1. **Given** the admin views the idea list, **When** an idea has at least one recorded score, **Then** the idea card displays its aggregate average score.
2. **Given** the admin views the idea list, **When** an idea has no scores, **Then** no score indicator is shown on the idea card.
3. **Given** a score is submitted for an idea, **When** the admin navigates back to the idea list, **Then** the score indicator reflects the updated aggregate.

---

### Edge Cases

- What happens when an admin submits duplicate stage transitions for the same stage (re-review scenario)? The latest scores for a stage replace or are averaged with prior scores — the summary always reflects all recorded transitions.
- What if all dimensions have the maximum score of 5 for every stage? The average should display as 5.0 without overflow or formatting errors.
- What if a pipeline stage is skipped (idea rejected before all stages complete)? Only stages with recorded scores are included in the average; missing stages are excluded.
- What happens when the idea list is very long (100+ ideas)? Aggregate scores must not cause noticeable page load degradation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a fixed set of evaluation dimensions for scoring. Dimensions are: **Innovation** (novelty and creativity), **Feasibility** (practical achievability), **Business Impact** (value and ROI potential), **Strategic Alignment** (fit with organisational goals), **Technical Soundness** (technical quality and clarity).
- **FR-002**: Each evaluation dimension MUST accept a whole-number score from 1 (lowest) to 5 (highest). Scores outside this range MUST be rejected.
- **FR-003**: The scoring panel MUST be presented to admins on the stage action form for every active pipeline stage (Screening, Technical Review, Business Review, Final Decision).
- **FR-004**: Dimension scores MUST be optional — an admin MUST be able to advance or reject a stage without providing any scores.
- **FR-005**: When scores are submitted, they MUST be persisted linked to the specific stage transition record (stage, idea, admin, timestamp).
- **FR-006**: The pipeline review page MUST display a score summary panel showing all recorded dimension scores grouped by stage, plus a per-stage average and an overall average across all stages and dimensions.
- **FR-007**: The overall average MUST be calculated as the arithmetic mean of all recorded individual dimension scores for the idea, rounded to one decimal place.
- **FR-008**: The admin idea list MUST display the current aggregate score for pipeline ideas that have at least one recorded score; ideas without scores MUST show no score indicator.
- **FR-009**: Scores MUST be associated with the admin who submitted them and the timestamp of submission.
- **FR-010**: Scores MUST be read-only after submission — admins cannot edit or delete a previously submitted score set.

### Key Entities

- **EvaluationScore**: A set of 1–5 ratings on the five fixed dimensions, linked to a stage transition, an idea, and an admin. Attributes: id, ideaId, stageTransitionId, adminId, dimensionName, score (1–5), createdAt.
- **ScoreSummary** (derived, not stored): Per-stage averages and overall average computed at read time from EvaluationScore records for an idea.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can complete the scoring panel and submit a stage review in under 60 seconds additional time compared to a review without scoring.
- **SC-002**: The score summary panel on the pipeline review page loads within 1 second after the page renders for ideas with up to 20 recorded stage transitions.
- **SC-003**: 100% of submitted score values outside the 1–5 range are rejected by validation before persistence.
- **SC-004**: The aggregate score displayed in the admin idea list matches the average computed from the stored dimension scores with no rounding discrepancy greater than 0.1.
- **SC-005**: Zero existing pipeline workflow tests regress — all prior stage advancement, rejection, and clarification flows continue to pass after the scoring system is introduced.

## Assumptions

- Evaluation dimensions are fixed for this phase; configurable dimensions are out of scope.
- Scoring is advisory only — no automated decisions (accept/reject) are triggered by any score threshold.
- The five fixed dimensions (Innovation, Feasibility, Business Impact, Strategic Alignment, Technical Soundness) are agreed by stakeholders and do not require further clarification.
- Scores are captured per stage transition, not per stage in isolation — if a stage generates multiple transitions (e.g., clarification rounds), each transition can have its own score set.
- Mobile/responsive layout for the scoring panel is required but does not need to be a separate optimisation effort; the existing responsive UI patterns suffice.
- Score data is visible only to admins; submitters do not see scores for their ideas.
- Retrospective scoring (adding scores to already-completed transitions) is out of scope for this phase.
