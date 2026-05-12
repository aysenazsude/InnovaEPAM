import { ideas, attachments } from '@/lib/db/schema';
import type { TestDB } from './authHelpers';
import type { IdeaStatus } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function submitIdea(
  db: TestDB,
  submitterId: string,
  overrides: {
    title?: string;
    description?: string;
    category?: string;
    status?: IdeaStatus;
  } = {}
): Promise<typeof ideas.$inferSelect> {
  const numericId = Math.floor(Math.random() * 900_000) + 100_000;
  const [idea] = await db
    .insert(ideas)
    .values({
      id: `IDEA-${String(numericId).padStart(4, '0')}`,
      numericId,
      title: overrides.title ?? 'Test Idea Title',
      description: overrides.description ?? 'A detailed description of the test idea.',
      category: overrides.category ?? 'technical_innovation',
      status: overrides.status ?? 'submitted',
      submitterId,
      submittedAt: Math.floor(Date.now() / 1000),
      adminComment: null,
      evaluatingAdminId: null,
      evaluatedAt: null,
    })
    .returning();
  return idea;
}

export async function getIdeaById(
  db: TestDB,
  id: string
): Promise<typeof ideas.$inferSelect | undefined> {
  const [idea] = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1);
  return idea;
}
