import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { attachFile } from '../../helpers/attachmentHelpers';
import { validateAttachment } from '@/lib/attachments/attachmentValidator';
import { attachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { FILE_SIZE_LIMIT } from '@/lib/constants';

describe('attachment upload integration', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should create an attachment record with correct shape', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);

    const attachment = await attachFile(testDb, idea.id, 'application/pdf', 1_048_576);

    expect(attachment.ideaId).toBe(idea.id);
    expect(attachment.fileType).toBe('application/pdf');
    expect(attachment.fileSize).toBe(1_048_576);
    expect(attachment.storagePath).toBeDefined();
  });

  it('should return 409-compatible validation error on second upload attempt', () => {
    // existingCount = 1 simulates a file already uploaded
    const result = validateAttachment('application/pdf', 1_000_000, 1);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(409);
  });

  it('should return 400-compatible validation error for oversized file', () => {
    const result = validateAttachment('application/pdf', FILE_SIZE_LIMIT + 1, 0);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it('should return 400-compatible validation error for disallowed MIME type', () => {
    const result = validateAttachment('text/plain', 1_000_000, 0);
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it('should delete attachment record from DB when removed', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    const attachment = await attachFile(testDb, idea.id);

    await testDb.delete(attachments).where(eq(attachments.id, attachment.id));

    const [remaining] = await testDb
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachment.id))
      .limit(1);

    expect(remaining).toBeUndefined();
  });
});
