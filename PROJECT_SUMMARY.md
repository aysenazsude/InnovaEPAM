# InnovatEPAM Portal - Project Summary

## Overview
InnovatEPAM is a full-stack idea management portal where EPAM employees submit innovation ideas that flow through a structured 4-stage review pipeline. Admins evaluate ideas anonymously (blind review) with per-stage dimension scoring, while submitters track progress through a personalized welcome dashboard with real-time statistics. The portal is built with Next.js 16 App Router, React 19, SQLite, and NextAuth 5, following a spec-driven development workflow using SpecKit.

## Phases Completed

### Phase 1: Core Portal
- [x] User registration with email/password
- [x] User login/logout
- [x] Role-based access (submitter/admin)
- [x] Idea submission form
- [x] Single file attachment
- [x] Idea listing page
- [x] Status tracking
- [x] Admin evaluation workflow

### Phase 2: Smart Submission Forms
- [x] Dynamic form fields by category
- [x] Category-specific guidance

### Phase 3: Multi-Media Support
- [x] Multiple file attachments
- [x] File preview capabilities

### Phase 4: Draft Management
- [x] Save ideas as drafts
- [x] Edit drafts before submission

### Phase 5: Multi-Stage Review
- [x] 4-stage evaluation pipeline (Screening → Technical Review → Business Review → Final Decision)
- [x] Stage-specific notes and actions

### Phase 6: Blind Review
- [x] Anonymous evaluation mode (submitter identity hidden from admins)
- [x] Identity preserved server-side for notifications after decision

### Phase 7: Scoring System
- [x] Multi-dimension scoring (1–5 rating per evaluation dimension per stage)
- [x] Score aggregation and per-stage/overall averages

### Phase 8: Welcome Dashboard
- [x] Personalized submitter stats (total submitted, approved, pending)
- [x] System-wide statistics panel
- [x] Quick-action shortcuts for submitters and admins

### Phase 9: Idea Spotlight *(in progress)*
- [x] Spotlight card for best idea of the month (algorithmic + admin pin)
- [x] Recently Approved feed (latest 5 approved ideas)
- [x] Monthly Activity strip (submitted / in-review / approved counts)

## Technical Decisions

### Technology Stack
- Framework: Next.js 16 (App Router, Server Actions)
- UI: React 19 + Tailwind CSS 4 + shadcn/ui (Radix UI primitives) + lucide-react
- Storage: SQLite via better-sqlite3 + Drizzle ORM 0.45 (migrations-based schema)
- Auth: NextAuth 5 (JWT strategy, edge-compatible middleware)
- Testing: Jest 30 + React Testing Library 16 + Playwright 1.60 + Stryker (mutation)
- Key Libraries: bcryptjs, uuid, date-fns

### Key Architecture Decisions
**Split auth config (edge vs. Node.js):** `auth.config.ts` is kept free of Node.js-only imports (no DB, no bcrypt) so it can run in Next.js middleware at the edge. The full `auth.ts` extends it with credentials provider and database lookup. This pattern enables middleware-level route protection without cold-start penalties.

**Server Actions over API routes:** All data mutations (idea submission, stage transitions, scoring, spotlight pinning) go through Next.js Server Actions rather than a separate REST API layer. This eliminates client-side fetch boilerplate, co-locates validation with business logic, and keeps the bundle lean.

## Challenges & Solutions

### Challenge 1: SQLite concurrency and singleton connection in Next.js
**Solution:** Wrapped the `better-sqlite3` client in a module-level singleton that is reused across Server Actions and server components in the same process. A `dbInstance` parameter was threaded through all data functions to allow test injection without process-level state.

### Challenge 2: Blind review — preventing identity leakage without duplicating data
**Solution:** Identity masking was applied at the server action / query layer rather than in components. Admin-facing queries select only anonymous labels; submitter identity is retained in the DB and used exclusively for notification dispatch. No client component ever receives PII when the viewer is an admin.

## AI Collaboration

### Tools Used
- GitHub Copilot (VS Code agent mode with Claude Sonnet)
- SpecKit (spec → plan → tasks → implement workflow)

### What Worked Well
Having a spec and plan before writing any code made implementation nearly mechanical — Copilot could generate correct code on the first attempt because the context was precise and complete. The TDD loop (write failing test, implement, refactor) enforced by the constitution kept the codebase clean across all 9 phases.

### What Could Be Improved
Mutation testing (Stryker) revealed a few tautological tests that passed even with logic removed; investing more time in the RED phase of TDD would have caught these earlier.

## Time Breakdown

| Phase | Actual |
|-------|--------|
| Setup & SpecKit | ~1 h |
| Phase 1: Core Portal | ~3 h |
| Phase 2: Smart Submission Forms | ~1.5 h |
| Phase 3: Multi-Media Support | ~1.5 h |
| Phase 4: Draft Management | ~1.5 h |
| Phase 5: Multi-Stage Review | ~2 h |
| Phase 6: Blind Review | ~1 h |
| Phase 7: Scoring System | ~1.5 h |
| Phase 8: Welcome Dashboard | ~1 h |
| Phase 9: Idea Spotlight | ~2 h |
| Documentation | ~0.5 h |

## Reflection

### Key Learning
Specification-driven development compresses implementation time dramatically. Writing the spec and plan first eliminated nearly all "what should this do?" moments during coding, which is where most time is lost in typical projects.

### What I'd Do Differently
Invest more time upfront in the data model across all phases, not just the current one. Several migrations could have been avoided if the scoring and spotlight tables had been anticipated in the Phase 1 schema design.

### SDD vs Vibe Coding
With SpecKit the implementation felt like filling in a form rather than making decisions. Each task in `tasks.md` had a clear input, output, and test criterion, so context-switching between sessions was nearly free — picking up where I left off required reading the plan, not the code.

### AI Collaboration Insight
The quality of AI output scales directly with the quality of context provided. When prompts included the spec, data model, and existing file paths, Copilot produced production-ready code. When context was thin, the output required significant correction. SpecKit effectively solved the context problem.

---

*Submitted by: Ayşenaz Sudete Kel*
*Date: 2026-05-15*
*A201 Cohort: May 2026*
