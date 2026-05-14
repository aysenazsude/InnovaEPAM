import type { IdeaWithAttachments } from '@/lib/actions/ideas';

/**
 * Admin-facing view of a submitted idea.
 * submitterId is intentionally absent to enforce blind review at compile time.
 * The field is stripped before data crosses the server → client component boundary.
 */
export type AdminIdeaView = Omit<IdeaWithAttachments, 'submitterId'> & {
  aggregateScore?: number;
};

/**
 * Strips submitterId from an idea before passing it to admin-facing client components.
 * Anonymisation is display-layer only — the original record in the database is unchanged.
 * Optionally attaches an aggregate score (average of all dimension scores across all stages).
 */
export function toAdminIdeaView(idea: IdeaWithAttachments, aggregateScore?: number): AdminIdeaView {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { submitterId: _omit, ...rest } = idea;
  return aggregateScore !== undefined ? { ...rest, aggregateScore } : rest;
}
