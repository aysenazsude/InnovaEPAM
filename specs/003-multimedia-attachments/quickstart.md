# Quickstart: Multi-Media Attachments — Phase 3

**Date**: 2026-05-14  
**Feature**: Multi-Media Attachments  
**Prerequisite**: Phase 1 (001-innovatepam-portal) and Phase 2 (002-smart-submission-forms) must be set up and running.

---

## Prerequisites

- Node.js 20 LTS
- npm 10+
- Existing `.env.local` from Phase 1/2 (contains `DATABASE_URL`, `UPLOAD_DIR`, `AUTH_SECRET`, `AUTH_URL`)

---

## Step 1 — Install Dependencies

No new runtime packages are required. Phase 3 is purely additive within the existing stack.

```bash
npm install
```

---

## Step 2 — Generate and Apply the DB Migration

Phase 3 adds the `upload_order_index` column to the `attachments` table.

```bash
npm run db:generate   # generates 0002_add_attachment_order_index.sql
npm run db:migrate    # applies the migration to your local SQLite database
```

Verify the migration applied:

```bash
npx drizzle-kit studio
# or inspect directly:
sqlite3 data/innovatepam.db ".schema attachments"
```

Expected schema includes: `upload_order_index INTEGER NOT NULL DEFAULT 0`

---

## Step 3 — Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Step 4 — Verify Multi-File Attachment (Manual Smoke Test)

1. Log in as a submitter (`/login`).
2. Navigate to `/ideas/new`.
3. Fill in title, description, and category.
4. Click the file input — select a JPG image. Verify a thumbnail appears.
5. Click the file input again — select a PDF. Verify a document icon + file name appears.
6. Click the file input again — select an MP4 video. Verify a video player widget appears (no auto-play).
7. Verify the add-file control is now disabled ("3 files attached — limit reached" message).
8. Click Remove on the PDF entry. Verify only the PDF is removed; JPG thumbnail and MP4 player remain.
9. Submit the form. Verify redirect to `/ideas/<id>` and all 2 attachments appear in the idea detail.
10. Log in as admin (`/admin`). Open the idea. Verify both attachments appear with download controls, thumbnail for image, and video player for video.

---

## Step 5 — Run Tests

```bash
# Unit tests only (fast gate)
npm run test:unit

# Integration tests
npm run test:integration

# Full coverage report
npm run test:coverage

# E2E (requires dev server running on port 3000)
npm run test:e2e

# Mutation score (runs on main branch; optional locally)
npm run test:mutation
```

Coverage thresholds enforced: ≥ 80% line, ≥ 75% branch.

---

## Environment Variables (unchanged from Phase 1/2)

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `./data/innovatepam.db` | SQLite database path |
| `UPLOAD_DIR` | `./data/uploads` | Disk directory for attachment files |
| `AUTH_SECRET` | `<random string>` | NextAuth session signing secret |
| `AUTH_URL` | `http://localhost:3000` | NextAuth base URL |

No new environment variables are introduced in Phase 3.

---

## File Upload Size Limits (nginx / reverse proxy)

If running behind nginx, ensure `client_max_body_size` is set to at least `31m` (30 MB combined + headers overhead) in your server block:

```nginx
client_max_body_size 31m;
```

Next.js's built-in dev server has no body size limit by default; this only applies to production deployments.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `upload_order_index` column missing | Migration not applied | Run `npm run db:migrate` |
| Video preview not rendering | Browser codec support | Ensure file is a valid H.264 MP4 or ProRes MOV; test in Chromium first |
| 422 response on valid file | Magic byte mismatch | Ensure the file is not renamed — check actual file signature |
| 403 on attachment download | Wrong user session | Confirm logged-in user is the idea submitter or an admin |
| Combined size rejected | Total > 30 MB | Remove a file to bring total below 30 MB |
