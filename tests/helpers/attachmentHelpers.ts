import { attachments } from '@/lib/db/schema';
import type { TestDB } from './authHelpers';
import { randomUUID } from 'crypto';

export async function attachFile(
  db: TestDB,
  ideaId: string,
  mimeType = 'application/pdf',
  sizeBytes = 1_048_576,
  uploadOrderIndex = 0
): Promise<typeof attachments.$inferSelect> {
  const id = randomUUID();
  const [attachment] = await db
    .insert(attachments)
    .values({
      id,
      ideaId,
      fileName: `test-file-${id}.pdf`,
      fileType: mimeType,
      fileSize: sizeBytes,
      storagePath: `${id}.pdf`,
      uploadOrderIndex,
      uploadedAt: Math.floor(Date.now() / 1000),
    })
    .returning();
  return attachment;
}
