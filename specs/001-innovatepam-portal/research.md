# Research: InnovatEPAM Portal — Phase 1 MVP

**Phase**: 0 | **Date**: 2026-05-13 | **Plan**: [plan.md](./plan.md)

All NEEDS CLARIFICATION items from Technical Context resolved below.

---

## R-001: Tailwind CSS v4 `@theme` for EPAM Brand Tokens

**Decision**: Use Tailwind CSS v4 with the `@theme` directive in `src/styles/globals.css` to declare all EPAM brand colour tokens.

**Rationale**: Tailwind v4 replaces `tailwind.config.js` colour configuration with a CSS-first `@theme` block. Tokens declared in `@theme` become both Tailwind utility classes (e.g., `bg-brand-500`, `text-brand-900`) and native CSS custom properties (`var(--color-brand-500)`), allowing shadcn/ui component overrides to consume the same source of truth. No separate config file needed.

**Implementation**:
```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* EPAM Brand Palette */
  --color-brand-50:  #e8f4ff;
  --color-brand-100: #cce6ff;
  --color-brand-200: #99ccff;
  --color-brand-500: #0077cc;   /* EPAM primary blue */
  --color-brand-600: #0066bb;
  --color-brand-700: #0055aa;
  --color-brand-900: #003366;

  --color-accent-400: #ff8533;
  --color-accent-500: #ff6600;  /* EPAM orange accent */
  --color-accent-600: #e65c00;

  --color-neutral-50:  #f8f9fa;
  --color-neutral-100: #f1f3f5;
  --color-neutral-200: #e9ecef;
  --color-neutral-500: #6c757d;
  --color-neutral-900: #1a1a2e;

  /* shadcn/ui semantic aliases → EPAM brand */
  --color-primary:            var(--color-brand-500);
  --color-primary-foreground: #ffffff;
  --color-accent:             var(--color-accent-500);
  --color-accent-foreground:  #ffffff;
  --color-background:         var(--color-neutral-50);
  --color-foreground:         var(--color-neutral-900);
  --color-muted:              var(--color-neutral-100);
  --color-muted-foreground:   var(--color-neutral-500);
  --color-border:             var(--color-neutral-200);
}
```

**Alternatives considered**:
- `tailwind.config.ts` (v3 approach) — rejected; Tailwind v4 makes this file redundant; `@theme` is the idiomatic v4 approach.
- CSS custom properties only (no Tailwind integration) — rejected; loses utility class generation, requiring manual style attributes.

---

## R-002: SQLite + Drizzle ORM in Next.js App Router

**Decision**: Use `better-sqlite3` (synchronous SQLite driver) paired with `drizzle-orm` for schema definition, type-safe queries, and migrations. Enable WAL mode on first connection via `PRAGMA journal_mode=WAL`.

**Rationale**:
- `better-sqlite3` is synchronous — ideal for Node.js server components and Server Actions which already run in a synchronous execution context in Next.js App Router.
- Drizzle ORM is the lightest type-safe ORM for SQLite: 2 runtime packages (`drizzle-orm` + `better-sqlite3`), schema declared as TypeScript, and migration management via `drizzle-kit` (dev dependency only).
- WAL mode enables concurrent readers while a single writer is active — essential for 500 concurrent users where the majority of requests are reads (browse feed) with occasional writes (submit, save draft).
- SQLite in WAL mode handles ~10,000 simple reads/second on commodity hardware, well above the required 500-user concurrent load for an internal portal.

**Important constraint**: `better-sqlite3` requires Node.js runtime. No page or route may use `export const runtime = 'edge'`.

**Alternatives considered**:
- Prisma + SQLite — rejected; Prisma requires `prisma generate`, a Rust-based query engine binary, and adds 3 extra packages vs Drizzle's 2.
- Raw SQL with `better-sqlite3` — rejected; no type safety, no migration tracking, significant maintenance burden across 5 related tables.
- Turso (libSQL/cloud SQLite) — rejected; introduces network latency, external cloud dependency, and violates minimal-deps principle for an internal portal.

---

## R-003: shadcn/ui with Tailwind CSS v4

**Decision**: Install shadcn/ui via `npx shadcn@latest init` and add individual components on demand. Components are copied into `src/components/ui/` as editable TypeScript source — they are not a runtime package import, so they do not count toward the dependency limit.

**Tailwind v4 compatibility**: shadcn/ui supports Tailwind v4 as of the 2025 release cycle. `npx shadcn@latest init` detects Tailwind v4 and configures `globals.css` integration automatically using CSS variable overrides that align with the `@theme` tokens defined in R-001.

**Components required for Phase 1**:
`Button`, `Input`, `Textarea`, `Select`, `Badge`, `Card`, `Separator`, `Label`, `Alert`, `Skeleton` (loading states)

**Alternatives considered**:
- Radix UI raw primitives — rejected; requires hand-styling every component, duplicating a11y work shadcn already provides.
- Headless UI — rejected; fewer components, React-only, less actively maintained for Tailwind v4.

---

## R-004: Email + Password Auth via next-auth v5 Credentials Provider

**Decision**: Use `next-auth@5` (Auth.js) with the `Credentials` provider backed by a local `users` table. Passwords hashed with `bcryptjs` at 12 salt rounds. Sessions use the `jwt` strategy with `maxAge: 28800` (8 hours). Brute-force lockout tracked in `users.failed_login_count` and `users.locked_until` columns.

**Auth config** (`src/lib/auth.ts`):
```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize({ email, password }) {
        const user = await db.query.users.findFirst({ where: eq(users.email, email as string) })
        if (!user) return null  // generic — do not reveal user existence

        // Lockout check
        if (user.lockedUntil && user.lockedUntil > Date.now() / 1000) return null

        const valid = await bcrypt.compare(password as string, user.passwordHash)
        if (!valid) {
          // Increment failure counter; set lock if threshold reached
          const count = user.failedLoginCount + 1
          await db.update(users).set({
            failedLoginCount: count,
            lockedUntil: count >= 5 ? Math.floor(Date.now() / 1000) + 900 : null,
          }).where(eq(users.id, user.id))
          return null
        }

        // Reset on success
        await db.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, user.id))
        return { id: user.id, email: user.email, name: user.displayName, role: user.role }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 28800 },
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
    async redirect({ url, baseUrl }) {
      // returnUrl support for expired-session redirects
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
  pages: { signIn: '/login' },
})
```

**Post-login role redirect** is handled in the `(auth)/login/page.tsx` Server Component: after `signIn()` resolves, `redirect('/admin')` for admins and `redirect('/ideas')` for submitters.

**Lockout behaviour**: error message shown is always generic ("Invalid credentials or account temporarily locked") — prevents user enumeration. The 15-minute lockout window (`lockedUntil = now + 900 s`) resets on successful login.

**Alternatives considered**:
- EPAM OIDC SSO — deferred to Phase 2; no OIDC credentials available for Phase 1 standalone deployment.
- Custom session management — rejected; security-critical (~500 LOC), violates Clean Code principle.
- Passport.js — rejected; CommonJS module, poor App Router Server Action integration.

---

## R-005: File Upload Handling in Next.js App Router

**Decision**: `POST /api/attachments` Route Handler accepts `multipart/form-data` via `request.formData()` (native in Next.js — no additional multipart library). Files written to `UPLOAD_DIR` with UUID filenames. Original filenames stored in DB only. Downloads served via authenticated `GET /api/attachments/[id]`.

**Phase 1 constraints**:
- Maximum **1 attachment per idea** — enforced at the app layer (count existing attachments for `ideaId` before accepting upload; reject with `409 Conflict` if one already exists).
- Maximum file size: **10 MB** (`FILE_SIZE_LIMIT = 10_485_760` bytes).
- Accepted MIME types (Phase 1): `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx), `application/vnd.openxmlformats-officedocument.presentationml.presentation` (.pptx), `image/png`, `image/jpeg`.

**Security controls**:
1. Session required on all attachment endpoints — unauthenticated requests return `401`.
2. MIME type validated against `ALLOWED_MIME_TYPES` constant before writing to disk.
3. File size validated against `Content-Length` header and confirmed by counting streamed bytes; reject before writing if size exceeds limit.
4. Disk filename is a UUID v4 — original filename stored in DB, never used on filesystem.
5. `UPLOAD_DIR` is outside `public/` — files cannot be directly accessed via URL.
6. Ownership check: attachment's `idea_id` must belong to the authenticated user.
7. Status check: upload rejected if idea is `under_review`, `accepted`, or `rejected`.

**Storage abstraction**: `src/lib/storage.ts` exports `saveFile(buffer, mimeType): string` and `deleteFile(storagePath): void`. Swapping to an external file service in a later phase requires only changes to this file.

**Alternatives considered**:
- `multer` middleware — rejected; CommonJS module, not compatible with App Router Route Handlers.
- External file storage service — valid production target; abstracted behind `storage.ts` for easy swap; local filesystem used for Phase 1.

---

## R-006: Brute-Force Lockout Storage Strategy

**Decision**: Store lockout state in the `users` table using two columns: `failed_login_count INTEGER NOT NULL DEFAULT 0` and `locked_until INTEGER` (Unix timestamp, nullable). Updated atomically in the `authorize` callback before returning from the credentials check.

**Rationale**:
- In-memory storage (e.g., a `Map` in module scope) is lost on server restart — lockout bypassed by restarting the process.
- An external cache (Redis, Memcached) would add a dependency that violates the Minimal Dependencies principle for a single-server deployment.
- The `users` table update is a single-row write on an indexed primary key — negligible performance impact.
- SQLite WAL mode allows the write to proceed concurrently with ongoing reads.

**Reset behaviour**: `failed_login_count` and `locked_until` are reset to `0` / `NULL` on any successful login.

**Alternatives considered**:
- Redis rate limiter — rejected; adds a runtime dependency for a single-server internal portal.
- In-memory `Map` — rejected; lost on server restart, allowing lockout bypass.

---

## R-007: bcryptjs Salt Rounds

**Decision**: Use `bcryptjs` with **12 salt rounds** for all password hashing.

**Rationale**: OWASP recommends a minimum work factor that results in ≥ 1 second hash time on the target hardware. 12 rounds produces ~250 ms on a modern server CPU — acceptable for a login form (one hash per request) while being prohibitively slow for offline dictionary attacks. `bcryptjs` is pure JavaScript (no native bindings), making it compatible with the Node.js runtime constraint and avoiding build-time native compilation issues.

**Registration flow** (`src/lib/actions/auth.ts`):
```typescript
import bcrypt from 'bcryptjs'
const SALT_ROUNDS = 12
const hash = await bcrypt.hash(password, SALT_ROUNDS)
```

**Alternatives considered**:
- `argon2` — stronger algorithm but requires native bindings (`node-gyp`) at build time; adds build complexity.
- `crypto.pbkdf2` (built-in Node.js) — no extra package, but requires manual salt generation and iteration tuning; higher maintenance burden.

---

## R-008: date-fns Usage Pattern

**Decision**: Import individual `date-fns` functions to ensure full tree-shaking. SQLite stores all timestamps as Unix seconds (INTEGER). `fromUnixTime(ts)` converts to JS `Date` before formatting.

**Key usages across the Phase 1 UI**:

| Context | Function | Output Example |
|---------|----------|----------------|
| Idea listing — submission date | `format(fromUnixTime(submittedAt), 'dd MMM yyyy, HH:mm')` | "08 May 2026, 14:35" |
| Idea detail — submission date | `format(fromUnixTime(submittedAt), 'dd MMM yyyy, HH:mm')` | "08 May 2026, 14:35" |
| Admin dashboard — submitted | `formatDistanceToNow(fromUnixTime(submittedAt), { addSuffix: true })` | "2 days ago" |

**Alternatives considered**:
- `Intl.RelativeTimeFormat` — rejected; verbose, requires manual unit selection logic (~40 LOC per call site).
- `dayjs` — equivalent bundle weight; `date-fns` already chosen, adding both would violate minimal-deps principle.

---

## Post-Phase-0 Constitution Re-Check

- **I. Clean Code** ✅ — All research decisions lead to patterns with clear single responsibilities. Lockout logic isolated to `authorize` callback; hashing isolated to Server Action. No complex abstractions introduced.
- **II. Simple & Responsive UI/UX** ✅ — shadcn/ui + Tailwind v4 @theme gives consistent, responsive, accessible UI with minimal custom CSS. Login/register forms use semantic `<form>`, `<label>`, `<input>` elements.
- **III. Minimal Dependencies** ✅ — 5 additional runtime packages, each justified. `shadcn/ui` copied source does not count as a runtime dependency. `drizzle-kit` is a dev dependency only. SSO (next-auth OIDC) and email (nodemailer) are deferred to later phases — not added to Phase 1.
