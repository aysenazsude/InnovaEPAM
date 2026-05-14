# Feature Specification: Idea Spotlight & News Section

**Feature Branch**: `009-idea-spotlight`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: User description: "add home page a news section, where the best idea of the month can be seen. Add extra useful features if there is"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Best Idea of the Month Spotlight (Priority: P1)

Any authenticated user visiting the home dashboard sees a highlighted "Idea of the Month" card that showcases the top-rated idea from the current calendar month, including its title, a short summary, the category it belongs to, the author's display name, and its composite score.

**Why this priority**: This is the core request. It gives every user instant visibility into the platform's most valued contribution for the month, reinforcing submission quality and community recognition.

**Independent Test**: Can be fully tested by logging in as any role, navigating to `/home`, and verifying that a spotlight card is visible with idea title, score, author, and category from the current month.

**Acceptance Scenarios**:

1. **Given** a month with at least one fully-scored idea, **When** any authenticated user loads `/home`, **Then** the Spotlight section displays a card with the highest-scoring idea's title, author, category, score, and submission date.
2. **Given** multiple ideas tied for the highest score, **When** the spotlight is rendered, **Then** the most recently submitted of the tied ideas is shown.
3. **Given** no scored ideas exist for the current month, **When** a user loads `/home`, **Then** the section displays a graceful empty state ("No spotlight yet this month — submit your best idea!").
4. **Given** an admin has manually pinned an idea as "Editor's Pick", **When** any user loads `/home`, **Then** the pinned idea takes precedence over the algorithmic winner and is labelled "Editor's Pick".

---

### User Story 2 — Recently Approved Ideas Feed (Priority: P2)

A submitter sees a compact feed on their home dashboard showing the most recently approved ideas (up to 5), so they can follow what the organisation has decided to advance. Each entry shows the idea title, category, and the date it was approved.

**Why this priority**: Approved ideas represent the organisation's strategic direction. Surfacing them to all users creates transparency and helps submitters understand what types of ideas get accepted.

**Independent Test**: Can be tested independently by approving one or more ideas and verifying that they appear in the "Recently Approved" section of `/home` ordered by approval date descending.

**Acceptance Scenarios**:

1. **Given** at least one approved idea, **When** any authenticated user loads `/home`, **Then** a "Recently Approved" section lists up to 5 ideas ordered by approval date (newest first), each showing title, category, and approval date.
2. **Given** more than 5 approved ideas exist, **When** the feed is rendered, **Then** only the 5 most recently approved are shown, with a "View all approved ideas" link.
3. **Given** no approved ideas exist, **When** the feed renders, **Then** the section shows a friendly placeholder ("The first approved idea will appear here.").

---

### User Story 3 — Monthly Activity Snapshot (Priority: P3)

A submitter on the home dashboard sees a compact "This Month" activity strip that shows how many ideas were submitted, how many advanced to review, and how many were approved during the current calendar month. This gives users a pulse of platform activity at a glance.

**Why this priority**: Provides motivational context — users can see platform momentum and know whether this is an active or quiet period, which encourages timely submissions.

**Independent Test**: Can be tested by checking that the activity strip reflects correct idea counts for the current month, independent of the spotlight and feed sections.

**Acceptance Scenarios**:

1. **Given** it is the start of a month with no submissions yet, **When** any user views `/home`, **Then** the Monthly Activity strip shows "0 submitted, 0 in review, 0 approved this month."
2. **Given** 10 ideas were submitted, 3 are in review, and 1 is approved this month, **When** any user views `/home`, **Then** the strip shows "10 submitted, 3 in review, 1 approved this month."
3. **Given** the strip values change during a session, **When** the user navigates back to `/home`, **Then** the strip reflects the current month's updated counts.

---

### User Story 4 — Admin: Pin an Editor's Pick (Priority: P4)

An admin can designate any idea as the "Editor's Pick" for the current month from the admin dashboard, overriding the algorithmically selected Idea of the Month. The admin can also clear the pick to revert to the algorithmic selection.

**Why this priority**: Gives editorial control to administrators, allowing them to highlight strategically important ideas regardless of their exact score rank.

**Independent Test**: Can be tested by an admin selecting a specific idea as Editor's Pick and verifying it appears in the spotlight for non-admin users.

**Acceptance Scenarios**:

1. **Given** an admin is on the admin dashboard, **When** they designate an idea as "Editor's Pick", **Then** that idea immediately appears as the spotlight on `/home` for all users, labelled "Editor's Pick".
2. **Given** an Editor's Pick is already set, **When** an admin clears it, **Then** the spotlight reverts to showing the highest-scoring idea of the month.
3. **Given** an Editor's Pick is set for a previous month, **When** a new calendar month begins, **Then** the pick automatically expires and the algorithmic selection takes over.

---

### Edge Cases

- What happens when an idea is the Editor's Pick but is later rejected? → The spotlight reverts to the algorithmic winner; admins are not alerted automatically.
- What if the current month has ideas but none have been through the scoring system? → The spotlight shows the most-recent unscored idea with a "Score pending" indicator rather than a score value.
- What if a user submits an idea after visiting `/home` in the same session? → The Monthly Activity counts update on the next visit (no real-time push required).
- What happens at month boundary (e.g., December 31 → January 1)? → All monthly sections reset automatically for the new month's data on the next page load.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display an "Idea of the Month" spotlight section on the home dashboard, visible to all authenticated users.
- **FR-002**: The spotlight MUST show the idea with the highest composite score submitted during the current calendar month.
- **FR-003**: When multiple ideas share the highest score, the system MUST show the most recently submitted one.
- **FR-004**: Admins MUST be able to designate any idea as "Editor's Pick", which overrides the algorithmic spotlight for the current month.
- **FR-005**: An Editor's Pick designation MUST automatically expire when a new calendar month begins.
- **FR-006**: The system MUST display a "Recently Approved" section showing up to 5 most recently approved ideas, ordered by approval date descending.
- **FR-007**: The "Recently Approved" section MUST include a link to a full list when more than 5 approved ideas exist.
- **FR-008**: The system MUST display a "Monthly Activity" strip showing the count of ideas submitted, in-review, and approved for the current calendar month.
- **FR-009**: When no spotlight candidate exists for the current month, the system MUST show a graceful empty state with a prompt to submit ideas.
- **FR-010**: All news section data MUST be computed server-side at page load; no client-side polling is required.
- **FR-011**: The spotlight card MUST display: idea title, author display name, category, score (or "Score pending" if unscored), and submission date.
- **FR-012**: Clicking the spotlight idea card MUST navigate the user to the full idea detail page.
- **FR-013**: The "Editor's Pick" label MUST be visually distinct from the standard spotlight presentation.

### Key Entities

- **SpotlightPick**: Represents an admin-designated Editor's Pick for a specific calendar month. Attributes: `ideaId`, `monthYear` (e.g. `"2026-05"`), `pinnedAt`, `pinnedByAdminId`. One record per month maximum.
- **Idea** *(existing)*: Existing entity, used to query by submission date and composite score.
- **IdeaScore** *(existing)*: Existing entity from the scoring system, used to compute the composite score for spotlight selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All authenticated users can see the Idea of the Month spotlight on `/home` within 1 page load, with no additional navigation required.
- **SC-002**: The spotlight correctly reflects the highest-scoring idea for the current month in 100% of test scenarios (algorithmic and editor's pick paths).
- **SC-003**: The "Recently Approved" feed displays the correct 5 most recent approvals in the correct order across all tested scenarios.
- **SC-004**: The Monthly Activity strip values match the actual database counts for the current month with zero discrepancy in integration tests.
- **SC-005**: Admins can pin and unpin an Editor's Pick in under 30 seconds from the admin dashboard.
- **SC-006**: All sections degrade gracefully (friendly empty states) when no data is available, with no blank or broken UI.
- **SC-007**: Month-boundary transitions are handled correctly — spotlight and activity data resets for the new month on first page load after rollover.

## Assumptions

- The composite score used for spotlight selection is the average of all evaluator scores already implemented in the scoring system (Feature 007).
- Ideas without any scores are eligible for the spotlight only if no scored ideas exist in the current month; in that case the most recently submitted unscored idea is shown with a "Score pending" indicator.
- The "current month" is determined by the server's clock in UTC; no per-user timezone adjustment is required for v1.
- The "Recently Approved" feed shows ideas with `status = 'approved'`, ordered by the timestamp when status changed to `'approved'` (approval date).
- The "in review" count in the Monthly Activity strip counts ideas with pipeline statuses: `screening`, `technical_review`, `business_review`, `final_decision`, `awaiting_clarification`.
- Admin Editor's Pick UI is a simple action on the existing admin idea detail view, not a separate dedicated page.
- Real-time updates (WebSockets, SSE) are out of scope; all data refreshes on page navigation.
- The spotlight section is read-only for submitters and reviewers; only admins can set Editor's Pick.
- Mobile responsiveness follows the same breakpoints already established by the existing dashboard layout.
