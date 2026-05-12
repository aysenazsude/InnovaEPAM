# Data Model: InnovatEPAM Portal — Phase 1 MVP

**Phase**: 1 | **Date**: 2026-05-13 | **Plan**: [plan.md](./plan.md)

## Storage Engine

SQLite (WAL mode) via `better-sqlite3` + Drizzle ORM.
Database file: `./data/innovatepam.db` (path configurable via `DATABASE_URL` env var).
WAL mode enabled on first connection: `PRAGMA journal_mode=WAL`.

---

## Entity: `users`

Registered portal users. Passwords are hashed with bcryptjs at 12 salt rounds. Roles are assigned at registration (submitter) or out-of-band by a platform administrator (admin).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | UUID v4. Generated at registration. |
| `display_name` | TEXT | NOT NULL | Free text, as provided at registration. |
| `email` | TEXT | NOT NULL UNIQUE | Normalised to lowercase before storage. Used as login identifier. |
| `password_hash` | TEXT | NOT NULL | bcrypt hash, 12 salt rounds. |
| `role` | TEXT | NOT NULL DEFAULT `'submitter'` | Enum: `submitter` \| `admin`. |
| `failed_login_count` | INTEGER | NOT NULL DEFAULT 0 | Incremented on each failed login attempt. Reset to 0 on successful login. |
| `locked_until` | INTEGER | | Unix timestamp (seconds). NULL if not locked. Set to `now + 900` after 5 consecutive failures. |
| `created_at` | INTEGER | NOT NULL | Unix timestamp. Set once at registration. |

**Indexes**:
- `idx_users_email` on `(email)` — login lookup

**Business rules** (enforced in `src/lib/auth.ts` and `src/lib/actions/auth.ts`):
- Registration rejects duplicate emails (`UNIQUE` constraint + explicit app-level check for clear error message).
- Password MUST meet: min 8 characters, at least 1 uppercase, 1 lowercase, 1 digit.
- Account is locked when `failed_login_count >= 5`; lock expires when `locked_until <= now`.
- Login error message is always generic — does not reveal whether email exists.

---

## Entity: `ideas`

Submitted innovation ideas. Ideas start with status `submitted` (no draft state in Phase 1).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | Human-readable: `IDEA-0001`. Generated on submission. |
| `numeric_id` | INTEGER | NOT NULL UNIQUE AUTOINCREMENT | Source for sequential ID generation. |
| `title` | TEXT | NOT NULL | Max 100 chars enforced at app layer. |
| `description` | TEXT | NOT NULL | Max 2 000 chars enforced at app layer. |
| `category` | TEXT | NOT NULL | Enum values: `technical_innovation` \| `process_improvement` \| `client_solution` \| `product_enhancement` \| `other` |
| `status` | TEXT | NOT NULL DEFAULT `'submitted'` | Enum: `submitted` \| `under_review` \| `accepted` \| `rejected` |
| `submitter_id` | TEXT | NOT NULL | FK → `users.id`. |
| `submitted_at` | INTEGER | NOT NULL | Unix timestamp. Set at creation. |
| `admin_comment` | TEXT | | Nullable. Populated when admin accepts or rejects. |
| `evaluating_admin_id` | TEXT | | FK → `users.id`. Set when status transitions to `under_review`. |
| `evaluated_at` | INTEGER | | Unix timestamp. Set when admin records accept/reject decision. |

**Indexes**:
- `idx_ideas_submitter_id` on `(submitter_id)` — my ideas listing
- `idx_ideas_status` on `(status)` — admin dashboard filter
- `idx_ideas_submitted_at` on `(submitted_at DESC)` — chronological ordering

**State transition rules** (enforced in `src/lib/actions/evaluation.ts`):

```
submitted   → under_review   Admin opens idea detail (automatic on view).
under_review → accepted       Admin clicks Accept with non-empty comment.
under_review → rejected       Admin clicks Reject with non-empty comment.
```

Only admins may trigger status transitions. Submitters have no mutation access after submission in Phase 1.

**Validation** (enforced at both client and server side):
- `title`: required, max 100 characters (character counter shown in form).
- `description`: required, max 2 000 characters (character counter shown in form).
- `category`: required, must be one of the 5 predefined values.
- `admin_comment`: required when accepting or rejecting (non-empty after trim).

---

## Entity: `attachments`

Files uploaded by submitters and associated with an idea. **One attachment per idea maximum** — enforced at the application layer (count check before upload).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | UUID v4. |
| `idea_id` | TEXT | NOT NULL | FK → `ideas.id` ON DELETE CASCADE. |
| `file_name` | TEXT | NOT NULL | Original filename as provided by the submitter. Never used as disk filename. |
| `file_type` | TEXT | NOT NULL | MIME type (e.g., `application/pdf`). |
| `file_size` | INTEGER | NOT NULL | Size in bytes. |
| `storage_path` | TEXT | NOT NULL UNIQUE | Server filesystem path relative to `UPLOAD_DIR`. Disk filename is a UUID v4. |
| `uploaded_at` | INTEGER | NOT NULL | Unix timestamp. |

**Indexes**:
- `idx_attachments_idea_id` on `(idea_id)`

**Constraints enforced at app layer** (`src/lib/constants.ts`):
- Maximum **1 file per idea** — upload rejected with `409 Conflict` if an attachment already exists for the idea.
- `file_size` ≤ `FILE_SIZE_LIMIT` (10,485,760 bytes = 10 MB).
- `file_type` must be in `ALLOWED_MIME_TYPES`.

**Allowed MIME types** (`ALLOWED_MIME_TYPES` constant):
```typescript
[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'image/png',
  'image/jpeg',  // .jpg / .jpeg
]
```

---

## Entity: `idea_categories`

Static reference data defining the available idea categories. Seeded at migration time; not configurable through the UI in Phase 1.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `slug` | TEXT | PRIMARY KEY | URL/code-safe identifier, e.g., `technical_innovation`. |
| `name` | TEXT | NOT NULL | Display label shown in the category selector. |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | Controls display order in the form selector. |

**Seed data**:

| slug | name | sort_order |
|------|------|-----------|
| `technical_innovation` | Technical Innovation | 1 |
| `process_improvement` | Process Improvement | 2 |
| `client_solution` | Client Solution | 3 |
| `product_enhancement` | Product Enhancement | 4 |
| `other` | Other | 5 |

---

## Entity Relationships

```
users        1 ──── * ideas           (submitter_id → users.id)
users        1 ──── * ideas           (evaluating_admin_id → users.id, nullable)
ideas        1 ──── 0..1 attachments  (idea_id → ideas.id, CASCADE DELETE)
idea_categories  (slug stored as TEXT in ideas.category — no FK, seeded reference data)
```

---

## Drizzle Schema (TypeScript)

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:                text('id').primaryKey(),
  displayName:       text('display_name').notNull(),
  email:             text('email').notNull().unique(),
  passwordHash:      text('password_hash').notNull(),
  role:              text('role').notNull().default('submitter'),
  failedLoginCount:  integer('failed_login_count').notNull().default(0),
  lockedUntil:       integer('locked_until'),
  createdAt:         integer('created_at').notNull(),
})

export const ideas = sqliteTable('ideas', {
  id:                 text('id').primaryKey(),
  numericId:          integer('numeric_id').notNull().unique(),
  title:              text('title').notNull(),
  description:        text('description').notNull(),
  category:           text('category').notNull(),
  status:             text('status').notNull().default('submitted'),
  submitterId:        text('submitter_id').notNull().references(() => users.id),
  submittedAt:        integer('submitted_at').notNull(),
  adminComment:       text('admin_comment'),
  evaluatingAdminId:  text('evaluating_admin_id').references(() => users.id),
  evaluatedAt:        integer('evaluated_at'),
})

export const attachments = sqliteTable('attachments', {
  id:          text('id').primaryKey(),
  ideaId:      text('idea_id').notNull().references(() => ideas.id),
  fileName:    text('file_name').notNull(),
  fileType:    text('file_type').notNull(),
  fileSize:    integer('file_size').notNull(),
  storagePath: text('storage_path').notNull().unique(),
  uploadedAt:  integer('uploaded_at').notNull(),
})

export const ideaCategories = sqliteTable('idea_categories', {
  slug:      text('slug').primaryKey(),
  name:      text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})
```

---

## Migration Strategy

Migrations are generated and applied via `drizzle-kit`:

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply all pending migrations (also seeds idea_categories)
npx drizzle-kit migrate
```

Seed data for `idea_categories` is embedded in the initial migration SQL file (`migrations/0001_seed_categories.sql`).
