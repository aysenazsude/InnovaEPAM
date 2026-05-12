# Feature Specification: InnovatEPAM Portal — Phase 1 MVP

**Feature Branch**: `001-innovatepam-portal`
**Created**: 2026-05-12
**Updated**: 2026-05-13
**Status**: Draft
**Scope**: Phase 1 MVP — User Management, Idea Submission, Evaluation Workflow

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Register and Log In (Priority: P1)

A new employee visits the portal and creates an account using their name, email address, and a password. On subsequent visits they log in with their credentials. Either role (submitter or admin) follows this same flow.

**Why this priority**: Every other action in the portal requires an authenticated identity. Without registration and login, no other user story can proceed.

**Independent Test**: A tester can visit the portal unauthenticated, register a new account, receive confirmation, log in with those credentials, and verify they land on a role-appropriate home page — all without depending on any other feature.

**Acceptance Scenarios**:

1. **Given** a visitor is on the registration page, **When** they provide a unique email address, a display name, and a password meeting the minimum strength requirement, **Then** an account is created and they are redirected to the home page as a logged-in submitter.
2. **Given** a visitor attempts to register with an email address already in use, **When** they submit the form, **Then** an error message states the email is already registered and the form is not submitted.
3. **Given** a registered user is on the login page, **When** they provide correct credentials, **Then** they are authenticated and redirected to `/ideas` if their role is submitter, or to `/admin` if their role is admin.
4. **Given** a registered user provides incorrect credentials, **When** they submit the login form, **Then** an error message is shown and access is denied.
5. **Given** a logged-in user clicks "Logout", **When** the action completes, **Then** their session is terminated and they are redirected to the public login page; any subsequent attempt to access a protected page redirects to login.

---

### User Story 2 — Submit an Idea (Priority: P1)

An authenticated employee (submitter) fills in a simple idea form with a title, description, and category, optionally attaches a single file, and submits the idea for admin review.

**Why this priority**: This is the core value proposition of the portal. All other features (listing and evaluation) depend on ideas existing in the system.

**Independent Test**: A tester can log in as a submitter, navigate to "Submit Idea", complete the form fields, optionally upload a file, click "Submit", and verify the idea appears in their idea list with status "Submitted".

**Acceptance Scenarios**:

1. **Given** an authenticated submitter is on the "Submit Idea" page, **When** they provide a title, description, and category and click "Submit", **Then** the idea is saved with status "Submitted" and appears in the idea listing.
2. **Given** required fields (title, description, category) are missing, **When** the submitter clicks "Submit", **Then** the system highlights all missing fields and does not submit the form.
3. **Given** a submitter is on the submission form, **When** they attach a single file within the accepted size and type limits, **Then** the file name and size are displayed and the file is associated with the submission.
4. **Given** a submitter attempts to attach a second file, **When** they try to add another file, **Then** the system prevents it and informs them that only one attachment is allowed per idea.
5. **Given** a submitter attempts to upload a file exceeding the size limit, **When** the upload is attempted, **Then** the system rejects the file with a clear error stating the maximum allowed size.

---

### User Story 3 — View Idea Listing (Priority: P1)

An authenticated submitter can see a list of all ideas they have submitted, including each idea's title, category, submission date, and current status.

**Why this priority**: Submitters need to track what they have submitted and see how evaluations are progressing.

**Independent Test**: A tester submits one or more ideas, navigates to the idea list, and verifies each idea appears with the correct title, category, date, and status without requiring any admin action.

**Acceptance Scenarios**:

1. **Given** a submitter has submitted at least one idea, **When** they navigate to the idea listing page, **Then** all their submitted ideas are shown with title, category, submission date, and status.
2. **Given** a submitter has no submitted ideas, **When** they navigate to the idea listing page, **Then** an empty-state message is shown with a prompt to submit their first idea.
3. **Given** an idea's status has been updated by an admin, **When** the submitter views the listing, **Then** the updated status is reflected.

---

### User Story 4 — Evaluate an Idea as Admin (Priority: P1)

An admin user reviews all submitted ideas, opens an individual idea to read its full details and any attachment, and then accepts or rejects it by providing a written comment.

**Why this priority**: Without admin evaluation, ideas accumulate without resolution. This closes the loop between submission and outcome.

**Independent Test**: A tester logs in as an admin, opens a submitted idea, reads its content and attachment (if any), writes a comment, clicks "Accept" or "Reject", and verifies the idea status updates and the comment is saved.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they navigate to the evaluation dashboard, **Then** all ideas with status "Submitted" or "Under Review" are listed.
2. **Given** an admin opens an idea, **When** the detail view loads, **Then** the full title, description, category, submitter name, submission date, current status, and attachment (if present) are all visible.
3. **Given** an admin has read an idea, **When** they enter a comment and click "Accept", **Then** the idea status changes to "Accepted", the comment is saved and associated with the idea, and the submitter can see the new status.
4. **Given** an admin has read an idea, **When** they enter a comment and click "Reject", **Then** the idea status changes to "Rejected", the comment is saved, and the submitter can see the new status and the rejection comment.
5. **Given** an admin attempts to accept or reject without providing a comment, **When** they click the action button, **Then** the system prevents the action and asks for a comment.
6. **Given** an admin opens an idea with status "Submitted", **When** they open it, **Then** the status automatically transitions to "Under Review" to indicate the idea is being actively examined.

---

### Edge Cases

- What happens when an unauthenticated user tries to access a protected page? The system MUST redirect them to the login page and return them to the originally requested page after successful login.
- What happens when a user repeatedly enters wrong credentials? After 5 consecutive failures the account is locked for 15 minutes; the error message MUST NOT reveal whether the email exists in the system (prevent user enumeration).
- What happens if a submitter uploads a file that exceeds the size limit? The system MUST reject the upload with a clear error and allow the submitter to choose a different file without losing other form data.
- What happens if an admin tries to evaluate an idea that another admin is already reviewing? The status "Under Review" is visible to all admins; the system MUST allow only one admin to submit the final accept/reject action (first write wins), showing a conflict error to the second admin if they attempt to submit simultaneously.
- What happens when a session expires while a user is mid-action (e.g., filling in the submission form)? The system MUST redirect the user to the login page with a `returnUrl` parameter; after re-authentication the user is returned to the originally requested page; any unsaved form data is the user's responsibility (no server-side recovery in Phase 1).

---

## Clarifications

### Session 2026-05-12

- Q: What password strength requirements apply for registration? → A: Minimum 8 characters with at least one uppercase letter, one lowercase letter, and one number; this is a standard safe default for v1.
- Q: Can a submitter see other employees' ideas, or only their own? → A: Submitters see only their own ideas; a public or shared browse feed is out of scope for Phase 1.
- Q: Do admins see all ideas or only ideas within certain categories? → A: Admins see all submitted ideas regardless of category; no category-based access restriction in Phase 1.
- Q: What file types are accepted for the single attachment? → A: Common document and image types: PDF, DOCX, PPTX, PNG, JPG; maximum file size 10 MB. Multi-media and large files are deferred to a later phase.
- Q: How should the login endpoint be protected against brute-force attacks? → A: Account lockout — the account is locked for 15 minutes after 5 consecutive failed login attempts; a generic "Too many attempts, try again later" message is shown; the lockout timer resets on a successful login.
- Q: Where does each role land after a successful login? → A: Role-specific redirect — submitters are redirected to `/ideas` (their idea listing); admins are redirected to `/admin` (the evaluation dashboard showing all submitted ideas).
- Q: What is the page load performance target for core pages? → A: 2-second interactive load — all core pages (login, register, idea listing, submission form, admin dashboard) MUST load and be fully interactive within 2 seconds on a standard broadband connection (≥ 10 Mbps).
- Q: What are the length limits for Idea Title and Description fields? → A: Title max 100 characters (required); Description max 2 000 characters (required); both limits enforced client-side and server-side.
- Q: How long do authenticated sessions last and what happens when they expire? → A: 8-hour session — sessions expire after 8 hours of inactivity; any request on an expired session is redirected to the login page with a return URL so the user lands back on the originally requested page after re-authenticating.

---

## Requirements *(mandatory)*

### Functional Requirements

**User Management**

- **FR-001**: The portal MUST allow any visitor to register a new account by providing a display name, a unique email address, and a password meeting the minimum strength requirement (≥ 8 characters, at least one uppercase, one lowercase, one digit).
- **FR-002**: The system MUST reject registration if the provided email address is already associated with an existing account.
- **FR-003**: Registered users MUST be able to log in with their email address and password and log out at any time from any authenticated page; on successful login submitters MUST be redirected to `/ideas` and admins MUST be redirected to `/admin`.
- **FR-004**: Each account MUST be assigned exactly one role at registration: **submitter** (default) or **admin** (assigned by a platform administrator out-of-band for Phase 1).
- **FR-005**: All idea submission, listing, and evaluation pages MUST be accessible only to authenticated users; unauthenticated access MUST redirect to the login page.
- **FR-019**: After 5 consecutive failed login attempts for a given account, the system MUST lock that account for 15 minutes; during the lockout period all login attempts MUST be rejected with a generic message ("Too many attempts, try again later") that does not reveal whether the account exists; the lockout timer MUST reset upon a successful login.
- **FR-020**: Authenticated sessions MUST expire after 8 hours of inactivity; any request made on an expired session MUST be redirected to the login page with a `returnUrl` parameter preserving the originally requested path, so the user is returned there after successful re-authentication.

**Idea Submission**

- **FR-006**: Authenticated submitters MUST be able to access an idea submission form containing the following required fields: Idea Title (required, max 100 characters), Description (required, max 2 000 characters), and Category (selected from a predefined list); limits MUST be enforced both client-side (character counter shown) and server-side (request rejected if exceeded).
- **FR-007**: The submission form MUST offer the following category options: Technical Innovation, Process Improvement, Client Solution, Product Enhancement, and Other.
- **FR-008**: Submitters MUST be able to attach exactly one file per idea; supported types are PDF, DOCX, PPTX, PNG, JPG; maximum file size is 10 MB.
- **FR-009**: Submitters MUST be able to remove the attached file before submitting.
- **FR-010**: On successful submission the idea MUST be assigned a unique idea ID, recorded with the submitter's identity and submission timestamp, and given the initial status "Submitted".

**Idea Listing**

- **FR-011**: Authenticated submitters MUST be able to view a list of all ideas they have personally submitted.
- **FR-012**: Each entry in the idea listing MUST display the idea title, category, submission date, and current status.
- **FR-013**: Admins MUST be able to view a list of all ideas submitted by any user, filterable by status.

**Evaluation Workflow**

- **FR-014**: When an admin opens an idea with status "Submitted", the system MUST automatically transition its status to "Under Review".
- **FR-015**: Admins MUST be able to accept or reject any idea currently in "Submitted" or "Under Review" status by providing a mandatory written comment.
- **FR-016**: On admin acceptance the idea status MUST change to "Accepted"; on rejection it MUST change to "Rejected".
- **FR-017**: The admin's comment MUST be stored and visible to the submitter alongside the idea's final status.
- **FR-018**: Admins MUST NOT be able to submit an accept/reject action without providing a non-empty comment.

### Status Lifecycle

Ideas progress through the following statuses in order:

`Submitted` → `Under Review` → `Accepted` **or** `Rejected`

### Key Entities

- **User**: Unique ID, display name, email address (unique), hashed password, role (`submitter` | `admin`), account created timestamp.
- **Idea**: Unique ID, title (max 100 chars), description (max 2 000 chars), category, status (`submitted` | `under_review` | `accepted` | `rejected`), submitter reference, submission timestamp, admin comment (nullable, set on accept/reject), evaluating admin reference (nullable).
- **Attachment**: Idea reference, file name, file type, file size (bytes), storage reference, uploaded timestamp.

---

## Testing Strategy *(mandatory — aligned with Constitution v1.4.0, Principles IV–XI)*

All implementation MUST follow the RED-GREEN-REFACTOR cycle. Tests are written BEFORE
implementation code; test expectations are derived from the acceptance scenarios above,
not from the implementation.

### Test Layer Breakdown

#### Unit Tests (`tests/unit/` — mirrors `src/`)

Covers all isolated business logic, validation rules, and utility functions. All external
dependencies (data store, email, file storage) are replaced with fakes or stubs.

| Source module (expected path) | Test file | What is verified |
|---|---|---|
| `src/lib/auth/passwordValidator.ts` | `tests/unit/lib/auth/passwordValidator.test.ts` | Min-length rule, uppercase, lowercase, digit checks; rejects weak passwords |
| `src/lib/auth/sessionManager.ts` | `tests/unit/lib/auth/sessionManager.test.ts` | 8-hour expiry calculation, `returnUrl` preservation, lockout-timer logic |
| `src/lib/auth/lockoutPolicy.ts` | `tests/unit/lib/auth/lockoutPolicy.test.ts` | Increments failed-attempt counter, locks after 5 failures, resets on success |
| `src/lib/ideas/ideaValidator.ts` | `tests/unit/lib/ideas/ideaValidator.test.ts` | Required-field presence, title ≤ 100 chars, description ≤ 2 000 chars, category enum |
| `src/lib/ideas/statusMachine.ts` | `tests/unit/lib/ideas/statusMachine.test.ts` | Valid transitions (`Submitted→Under Review→Accepted/Rejected`); rejects invalid ones |
| `src/lib/attachments/attachmentValidator.ts` | `tests/unit/lib/attachments/attachmentValidator.test.ts` | Accepted MIME types (PDF, DOCX, PPTX, PNG, JPG), 10 MB size ceiling, single-file rule |

All unit test files MUST use `describe('moduleName', () => { ... })` + `it('should X when Y', ...)`.
`jest.useFakeTimers()` MUST be used wherever `Date.now()` or timer-based logic is exercised.

#### Integration Tests (`tests/integration/` — grouped by feature domain)

Covers Next.js API route handlers and server actions against a real (or seeded test) data store.
No external network calls are made; third-party services are replaced by `jest.mock(...)`.

| Feature domain | Test file | What is verified |
|---|---|---|
| `tests/integration/auth/register.test.ts` | Registration endpoint | Persists new user, rejects duplicate email (FR-001, FR-002) |
| `tests/integration/auth/login.test.ts` | Login endpoint | Returns session on correct credentials, blocks on wrong, locks after 5 failures (FR-003, FR-019) |
| `tests/integration/auth/session.test.ts` | Session middleware | Redirects expired sessions with `returnUrl`, passes valid sessions (FR-005, FR-020) |
| `tests/integration/ideas/submit.test.ts` | Idea submission endpoint | Saves idea with correct initial status and submitter reference (FR-006, FR-010) |
| `tests/integration/ideas/list.test.ts` | Idea listing endpoint | Returns only the requesting submitter's ideas; admin receives all (FR-011, FR-013) |
| `tests/integration/ideas/evaluate.test.ts` | Evaluation endpoint | Auto-transitions to Under Review, persists comment, enforces non-empty comment (FR-014–FR-018) |
| `tests/integration/attachments/upload.test.ts` | Attachment upload endpoint | Accepts valid files, rejects oversized / unsupported types, enforces single-file limit (FR-008, FR-009) |

#### E2E Tests (`tests/e2e/` — grouped by user journey, Playwright)

Covers critical end-to-end user workflows only. Each spec maps to one complete user story.
E2E tests MUST NOT duplicate assertions already covered by unit or integration tests.

| User journey | Playwright spec file | Scope |
|---|---|---|
| Submitter registration & login | `tests/e2e/auth/submitter-registers-and-logs-in.spec.ts` | Full happy-path registration → login → logout; session expiry redirect |
| Idea submission with attachment | `tests/e2e/ideas/submitter-submits-idea-with-attachment.spec.ts` | Complete submission form → file attach → submit → verify in listing |
| Admin evaluates an idea | `tests/e2e/evaluation/admin-evaluates-idea.spec.ts` | Admin login → opens idea → status auto-transitions → accept/reject with comment → verify submitter sees update |
| Account lockout flow | `tests/e2e/auth/account-lockout.spec.ts` | 5 failed logins → locked message → wait 15 min (Playwright clock fake) → unlock |

### Test Fixtures & Helpers (`tests/fixtures/`, `tests/helpers/`)

The following fixtures and factories MUST be created before writing tests that depend on them:

```
tests/
├── fixtures/
│   ├── users.ts          # createSubmitter(), createAdmin() — fully formed User objects
│   ├── ideas.ts          # createIdea(status?, overrides?) — covers all status values
│   └── attachments.ts    # createAttachment(type?, sizeBytes?) — for valid/invalid cases
└── helpers/
    ├── authHelpers.ts     # loginAs(role), registerUser(overrides?)
    ├── ideaHelpers.ts     # submitIdea(overrides?), getIdeaById(id)
    └── attachmentHelpers.ts # attachFile(type, sizeBytes)
```

All factory functions MUST accept a `Partial<T>` override parameter so individual tests
vary only the field under test (see Constitution Principle IX).

### Quality Gates (from Constitution Principles V & X)

| Gate | Target | Enforcement |
|---|---|---|
| Line coverage | ≥ 80% | `jest.config.ts` → `coverageThreshold`; blocks CI on failure |
| Branch coverage | ≥ 75% | Same |
| Mutation score | ≥ 75% | `stryker run` on `main` push; weekly scheduled full run |
| Unit test runtime | < 1 s per test | Jest `--verbose` output reviewed in PR |
| Integration test runtime | < 5 s per test | Same |
| Tautological assertions | 0 | `eslint-plugin-jest` (`jest/valid-expect`) at lint time |
| Flaky tests | 0 | Any intermittent failure opens a tracking issue within the sprint |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can register, log in, submit an idea with one attachment, and see it in their idea list — completing the full end-to-end flow in under 5 minutes.
- **SC-002**: An admin can open a submitted idea, review its details and attachment, and record an accept/reject decision with a comment in under 3 minutes.
- **SC-003**: 90% of first-time submitters successfully complete an idea submission without requiring assistance, as measured by task-completion rate in usability testing.
- **SC-004**: Status changes made by an admin are reflected in the submitter's idea listing within 5 seconds under normal conditions.
- **SC-005**: File uploads up to 10 MB complete successfully under normal network conditions with no data loss.
- **SC-006**: All core pages (login, register, submission form, idea listing, evaluation dashboard) are fully functional and visually correct on desktop (≥ 1280px) and mobile (≥ 320px) screen sizes.
- **SC-007**: All core pages (login, register, idea listing, submission form, admin dashboard) MUST load and be fully interactive within 2 seconds on a standard broadband connection (≥ 10 Mbps).

---

## Assumptions

- Role assignment for admins is performed out-of-band by a platform administrator for Phase 1; there is no self-service admin registration flow.
- The portal maintains its own user credential store (email + hashed password); no external SSO or identity provider is required for Phase 1.
- A predefined list of idea categories is seeded at launch and is not configurable through the UI in Phase 1.
- Notifications (email or in-portal) are out of scope for Phase 1; submitters must check their idea listing to see status updates.
- Draft management (saving partial submissions) is out of scope for Phase 1; the form must be completed and submitted in a single session.
- A public or shared idea browse feed is out of scope for Phase 1; submitters only see their own ideas.
- File storage for attachments uses standard server-side storage available in the deployment environment; no external storage service integration is required for Phase 1.
- Performance targets for Phase 1 are standard single-team-use scale; large-scale concurrency requirements are deferred to later phases.
