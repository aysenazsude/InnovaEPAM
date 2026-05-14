# Quickstart: Blind Review (Anonymous Evaluation)

**Feature**: 006-blind-review  
**Date**: 2026-05-14

## What this feature does

After this feature lands, every admin-facing idea view replaces the submitter's identity with **"Anonymous Submitter"**. Admins can still evaluate, accept, reject, and advance ideas through the pipeline — they simply cannot determine who submitted a given idea during the evaluation process.

Submitters are not affected. They see their own name on their own idea pages.

---

## Files changed

| File | Change type | Description |
|---|---|---|
| `src/lib/constants.ts` | Modified | Add `ANONYMOUS_SUBMITTER_LABEL` constant |
| `src/lib/ideas/anonymize.ts` | **New** | `AdminIdeaView` type + `toAdminIdeaView()` helper |
| `src/app/(portal)/admin/ideas/[id]/review/page.tsx` | Modified | Replace `{idea.submitterId}` with `{ANONYMOUS_SUBMITTER_LABEL}` |
| `src/components/admin/AdminIdeaList.tsx` | Modified | Accept `AdminIdeaView[]` instead of `IdeaWithAttachments[]` |
| `src/app/(portal)/admin/page.tsx` | Modified | Map ideas through `toAdminIdeaView()` before passing to `AdminIdeaList` |
| `tests/unit/lib/ideas/anonymize.test.ts` | **New** | Unit tests for `toAdminIdeaView()` |
| `tests/unit/components/admin/AdminIdeaList.test.tsx` | Modified | Update fixture type; assert submitter identity absent |
| `tests/e2e/ideas/admin-blind-review.spec.ts` | **New** | E2E: admin cannot see submitter name on any idea view |

---

## Prerequisites

- Node.js 20+
- Dev server: `npm run dev`
- Migrations: no new migrations required

---

## Developer guide

### Adding the constant

In `src/lib/constants.ts`:

```typescript
export const ANONYMOUS_SUBMITTER_LABEL = 'Anonymous Submitter';
```

### Creating the anonymize helper

Create `src/lib/ideas/anonymize.ts`:

```typescript
import type { IdeaWithAttachments } from '@/lib/actions/ideas';

export type AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'>;

export function toAdminIdeaView(idea: IdeaWithAttachments): AdminIdeaView {
  const { submitterId: _omit, ...rest } = idea;
  return rest;
}
```

### Updating the pipeline review page

In `src/app/(portal)/admin/ideas/[id]/review/page.tsx`, replace:
```tsx
Submitted by <strong>{idea.submitterId}</strong>
```
with:
```tsx
Submitted by <strong>{ANONYMOUS_SUBMITTER_LABEL}</strong>
```

### Updating `AdminIdeaList`

Change the `ideas` prop type from `IdeaWithAttachments[]` to `AdminIdeaView[]` and update the import.

### Updating the admin page

In `src/app/(portal)/admin/page.tsx`, map the ideas before passing:
```typescript
import { toAdminIdeaView } from '@/lib/ideas/anonymize';
// ...
const adminViews = allIdeas.map(toAdminIdeaView);
```

---

## Verification

```bash
# Type-check (must be zero errors)
npm run typecheck

# Lint (must be zero warnings)
npm run lint

# Unit tests
npm run test:unit

# E2E — admin blind review
npx playwright test tests/e2e/ideas/admin-blind-review.spec.ts
```

Manual verification:
1. Log in as a submitter, submit an idea
2. Log out, log in as admin
3. Open the idea in the admin list → verify no submitter name or user ID visible
4. Open Phase 1 evaluation detail → verify no submitter identity visible
5. Click "Start Pipeline Review" → verify pipeline review page shows "Anonymous Submitter"
6. Advance through stages, approve → verify no submitter identity shown at any stage
