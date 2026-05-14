# Feature Specification: Welcome Dashboard

**Feature Branch**: `008-welcome-dashboard`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: User description: "I want to create a welcome page. This page will show current number of ideas, current number of successful ideas, some statistics meaningful like that. Show last submission and its status. Add some features like that relevant."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submitter Views Personal Activity Overview (Priority: P1)

When a logged-in submitter visits the portal home page, they immediately see a personalised welcome section showing their own submission history at a glance: how many ideas they have submitted, how many were approved, and their most recent submission with its current status. This removes the need to scroll through the full ideas list to understand their personal standing.

**Why this priority**: This is the core use case. Every submitter who logs in lands on this page, so the personal summary is the highest-value element — it replaces a blank or generic landing screen with immediately meaningful information.

**Independent Test**: A submitter who has submitted at least one idea logs in. The page displays their submission count, approval count, and a card showing their latest submitted idea with the correct status label.

**Acceptance Scenarios**:

1. **Given** a submitter with three submitted ideas logs in, **When** they visit the home page, **Then** they see a count of 3 total submissions and a count reflecting how many were approved.
2. **Given** the submitter's most recent idea is in "Screening" status, **When** they view the home page, **Then** the "last submission" card shows the idea title and the label "Screening".
3. **Given** a submitter has never submitted an idea, **When** they visit the home page, **Then** they see a zero state message encouraging them to submit their first idea, and a visible call-to-action button.
4. **Given** the submitter's last submission was rejected, **When** they view the home page, **Then** the status indicator reflects "Rejected" clearly.

---

### User Story 2 - All Users See System-Wide Statistics (Priority: P2)

On the welcome page, any authenticated user (submitter or admin) can view a set of system-wide headline statistics — total ideas ever submitted, total ideas approved, and the number currently active in the review pipeline. This gives everyone a sense of the portal's impact and activity level.

**Why this priority**: System stats provide context and motivation — a submitter seeing that 12 ideas have been approved is more likely to submit their own. It is a secondary driver of engagement and requires no personal data from the viewer.

**Independent Test**: Any authenticated user (with or without prior submissions) visits the home page and sees at least three numeric statistics reflecting current system totals that match the actual database counts.

**Acceptance Scenarios**:

1. **Given** the portal has 45 ideas total and 8 approved, **When** any user visits the home page, **Then** the statistics section shows "45 ideas submitted" and "8 ideas approved" (or equivalent wording).
2. **Given** there are 5 ideas currently in the review pipeline, **When** any user views the page, **Then** a "pipeline" or "under review" count is visible and shows 5.
3. **Given** the database is empty (no ideas), **When** a user visits the home page, **Then** all statistics show 0 without errors or broken layout.

---

### User Story 3 - Submitter Accesses Quick Actions from the Welcome Page (Priority: P3)

The welcome page provides a clear call-to-action for submitters to begin a new idea submission and a link to view all their past submissions. For admins, equivalent shortcuts are shown to the admin review dashboard.

**Why this priority**: Quick actions reduce friction between the welcome page and the next intended step, turning the page from a passive display into an active launchpad. It is a usability enhancement that builds on P1 and P2.

**Independent Test**: A logged-in submitter with existing ideas can click "Submit New Idea" from the welcome page and land on the new submission form, and can click a second link to reach their ideas list — all from the welcome page without additional navigation.

**Acceptance Scenarios**:

1. **Given** a submitter views the welcome page, **When** they click the primary action button, **Then** they are taken to the new idea submission form.
2. **Given** a submitter views the welcome page, **When** they click "View My Ideas" or equivalent, **Then** they are taken to their personal ideas list.
3. **Given** an admin views the welcome page, **When** they see the page, **Then** they see a shortcut to the admin review dashboard instead of (or in addition to) the submitter actions.

---

### Edge Cases

- What if a user's session expires while viewing the welcome page? The page should redirect to the login screen on next interaction.
- What if the statistics query is slow due to a large dataset? Stats should load within an acceptable time; if not, a loading state prevents a blank page.
- What if the user's last submission was deleted or is otherwise unavailable? The last submission card should either show the next most recent idea or display a graceful empty state.
- What if an admin also has submitted ideas — which role's perspective is shown? The page shows the admin view (system stats + admin quick actions) when the logged-in user has the admin role.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The welcome page MUST be accessible to all authenticated users immediately after login and via the portal home route.
- **FR-002**: The page MUST display system-wide statistics including: total ideas submitted, total ideas approved, and total ideas currently in the review pipeline.
- **FR-003**: For submitter-role users, the page MUST display a personal summary showing: total ideas submitted by the user, total ideas approved for the user, and the number currently pending review.
- **FR-004**: For submitter-role users, the page MUST display a "last submission" card showing the title and current status of the most recently submitted idea.
- **FR-005**: When a submitter has no submitted ideas, the page MUST show a zero state with an invitation message and a prominent "Submit Your First Idea" call-to-action.
- **FR-006**: The page MUST include a primary call-to-action for submitters to navigate directly to the new idea form.
- **FR-007**: The page MUST include a navigation shortcut so users can reach their ideas list (submitters) or the admin dashboard (admins) in one click.
- **FR-008**: For admin-role users, the personal statistics section MAY be replaced with or supplemented by admin-relevant metrics (e.g., ideas awaiting review, pipeline counts per stage).
- **FR-009**: All statistics MUST reflect the current live state of the system at page load; no manual refresh should be required.
- **FR-010**: The page MUST render correctly when all statistics are zero (empty system state).

### Key Entities

- **SystemStats**: Aggregate counts — total submitted, total approved, total in pipeline.
- **UserStats**: Per-user counts — ideas submitted, approved, pending, rejected.
- **LastSubmission**: The single most recent submitted idea for the current user — title, status, submission date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A submitter can understand their personal submission standing (count, approval count, last idea status) in under 10 seconds of landing on the welcome page, without scrolling.
- **SC-002**: System-wide statistics displayed on the page match the actual database counts (zero tolerance for stale data on page load).
- **SC-003**: The welcome page loads and displays all statistics within 2 seconds under normal load conditions.
- **SC-004**: Users with zero submissions see a meaningful zero state (not an error or blank section) 100% of the time.
- **SC-005**: Clicking any quick-action link from the welcome page reaches the correct destination in one interaction for 100% of authenticated users.

## Assumptions

- The welcome page replaces or augments the current portal home route (`/ideas` or `/`) for authenticated users.
- Admin users already have a dedicated admin dashboard; the welcome page for admins may redirect to or link prominently to that dashboard rather than replacing it.
- Statistics are computed at page-load time (server-side); real-time live updates (e.g., WebSocket) are out of scope.
- The feature uses the existing authentication and session system; no new login flow is introduced.
- Mobile responsiveness follows the existing portal design system; no custom mobile breakpoints are required beyond what the current UI components already provide.
- The "last submission" refers to the most recently submitted idea (by submission timestamp), not the most recently updated one.
