# Quickstart: InnovatEPAM Portal — Developer Setup

**Date**: 2026-05-13 | **Plan**: [plan.md](./plan.md)

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 20 LTS | `node --version` → `v20.x.x` |
| npm | 10+ | `npm --version` → `10.x.x` |
| Git | any | `git --version` |

No external services (SSO, SMTP, cloud storage) are required for Phase 1.

---

## 1. Clone and Install

```bash
git clone <repo-url> innovatepam
cd innovatepam
npm install
```

---

## 2. Environment Configuration

Copy the example env file and populate it:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```bash
# ── NextAuth ──────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<random-32-char-string>

# ── SQLite Database ───────────────────────────────────────────────
DATABASE_URL=./data/innovatepam.db

# ── File Uploads ──────────────────────────────────────────────────
UPLOAD_DIR=./data/uploads
```

---

## 3. Database and Upload Directory Setup

```bash
# Create data directories (excluded from git via .gitignore)
mkdir -p data/uploads

# Generate and apply the initial migration (creates DB + seeds idea categories)
npx drizzle-kit migrate
```

This creates `data/innovatepam.db` with all 4 tables (`users`, `ideas`, `attachments`, `idea_categories`) and inserts the 5 seeded idea categories.

---

## 4. Create an Admin Account

Admins are assigned out-of-band in Phase 1. After registering a user through the UI, promote them to admin directly in the database:

```bash
npx drizzle-kit studio
```

Open `https://local.drizzle.studio`, find the user in the `users` table, and set `role = 'admin'`.

Alternatively, use the SQLite CLI:

```bash
sqlite3 data/innovatepam.db "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';"
```

---

## 5. shadcn/ui Initialisation (first-time only)

```bash
# Initialise shadcn with Tailwind v4 (auto-detected)
npx shadcn@latest init

# Add required components
npx shadcn@latest add button input textarea select badge card separator label alert skeleton
```

Components are copied into `src/components/ui/` as editable TypeScript source files.

---

## 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You are redirected to the login page. Register a new account to get started as a submitter.

---

## 7. Verify Setup

After registering and logging in as a **submitter** you should see:
- The **My Ideas** listing page (empty on first run) with a "Submit Idea" button.
- Navigating to **Submit Idea** shows the idea form with title, description, category, and optional file upload.

After promoting a user to **admin** and logging in you should see:
- The **Admin Dashboard** (`/admin`) listing all submitted ideas with a status filter.
- Opening any idea transitions it to "Under Review" and shows the accept/reject form.

---

## npm Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build (TypeScript compile + Next.js build) |
| `npm start` | Start production server (requires `npm run build` first) |
| `npm run lint` | ESLint check across all source files |
| `npm run format` | Prettier format all source files |
| `npm test` | Run Jest unit and integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npx drizzle-kit generate` | Generate a new SQL migration from schema changes |
| `npx drizzle-kit migrate` | Apply all pending migrations to the database |
| `npx drizzle-kit studio` | Open Drizzle Studio — browser-based DB GUI at `https://local.drizzle.studio` |

---

## Project Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Full URL of the portal (e.g., `http://localhost:3000` for development) |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing — generate with `openssl rand -base64 32` |
| `DATABASE_URL` | Yes | Path to SQLite file (default: `./data/innovatepam.db`) |
| `UPLOAD_DIR` | Yes | Directory for uploaded attachment files (default: `./data/uploads`) |
