import { drafts, draftCategoryData, draftAttachments, users } from '@/lib/db/schema';
import type { TestDB } from './authHelpers';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function createDraftInDb(
  db: TestDB,
  submitterId: string,
  overrides: {
    title?: string | null;
    description?: string | null;
    category?: string | null;
    version?: number;
    updatedAt?: number;
  } = {}
): Promise<typeof drafts.$inferSelect> {
  const now = Math.floor(Date.now() / 1000);
  const [draft] = await db
    .insert(drafts)
    .values({
      id: randomUUID(),
      submitterId,
      title: overrides.title !== undefined ? overrides.title : 'Test Draft',
      description: overrides.description !== undefined ? overrides.description : 'Test description',
      category: overrides.category !== undefined ? overrides.category : null,
      version: overrides.version ?? 1,
      createdAt: now,
      updatedAt: overrides.updatedAt ?? now,
    })
    .returning();
  return draft;
}

export async function cleanupDraftsByUser(db: TestDB, submitterId: string): Promise<void> {
  await db.delete(drafts).where(eq(drafts.submitterId, submitterId));
}

export async function getDraftById(
  db: TestDB,
  id: string
): Promise<typeof drafts.$inferSelect | undefined> {
  const [draft] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1);
  return draft;
}

export async function getDraftAttachments(
  db: TestDB,
  draftId: string
): Promise<typeof draftAttachments.$inferSelect[]> {
  return db.select().from(draftAttachments).where(eq(draftAttachments.draftId, draftId));
}
