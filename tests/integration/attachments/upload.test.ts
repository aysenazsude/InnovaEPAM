import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea as submitIdeaHelper } from '../../helpers/ideaHelpers';
import { attachFile } from '../../helpers/attachmentHelpers';
import { validateAttachment } from '@/lib/attachments/attachmentValidator';
import { attachments, ideas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { FILE_SIZE_LIMIT } from '@/lib/constants';
import { makeBuffer } from '../../fixtures/attachments';
import { submitIdea } from '@/lib/actions/ideas';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));

// Mock saveFile so integration tests do not touch the filesystem
jest.mock('@/lib/storage', () => {
  const original = jest.requireActual<typeof import('@/lib/storage')>('@/lib/storage');
  let callCount = 0;
  return {
    ...original,
    saveFile: jest.fn((_buffer: Buffer, _mime: string, _dir: string) => {
      callCount += 1;
      return `mock-storage-path-${callCount}.bin`;
    }),
    deleteFile: jest.fn(),
    __resetCallCount: () => { callCount = 0; },
  };
});

function makeFile(name: string, mimeType: string): File {
  const ext = '.' + name.split('.').pop()!;
  const buffer = makeBuffer(mimeType);
  return new File([buffer], name, { type: mimeType });
}

describe('attachment upload integration (Phase 1 — legacy single-file helpers)', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should create an attachment record with correct shape', async () => {
    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdeaHelper(testDb, submitter.id);

    const attachment = await attachFile(testDb, idea.id, 'application/pdf', 1_048_576);

    expect(attachment.ideaId).toBe(idea.id);
    expect(attachment.fileType).toBe('application/pdf');
    expect(attachment.fileSize).toBe(1_048_576);
    expect(attachment.storagePath).toBeDefined();
  });

  it('should return 409-compatible validation error on second upload attempt', () => {
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
    const idea = await submitIdeaHelper(testDb, submitter.id);
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

describe('submitIdea — multi-file attachment (Phase 3)', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitterId: string;

  beforeEach(async () => {
    testDb = createTestDb();
    const submitter = await loginAs(testDb, 'submitter');
    submitterId = submitter.id;
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitterId, role: 'submitter' } });
    // Reset storage mock call count
    const storage = jest.requireMock<{ __resetCallCount: () => void }>('@/lib/storage');
    if (storage.__resetCallCount) storage.__resetCallCount();
  });

  function buildFormData(files: File[]): FormData {
    const fd = new FormData();
    fd.set('title', 'Multi-File Idea');
    fd.set('description', 'An idea with multiple attachments for testing.');
    fd.set('category', 'technical_innovation');
    for (const f of files) fd.append('file', f);
    return fd;
  }

  it('persists 3 attachment rows with correct upload_order_index values 0, 1, 2', async () => {
    const files = [
      makeFile('doc.pdf', 'application/pdf'),
      makeFile('img.png', 'image/png'),
      makeFile('clip.mp4', 'video/mp4'),
    ];
    const fd = buildFormData(files);

    await expect(submitIdea(null, fd, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const rows = await testDb
      .select()
      .from(attachments)
      .where(
        eq(
          attachments.ideaId,
          (await testDb.select().from(ideas).limit(1))[0].id
        )
      );

    expect(rows).toHaveLength(3);
    const sorted = rows.sort((a, b) => a.uploadOrderIndex - b.uploadOrderIndex);
    expect(sorted[0].uploadOrderIndex).toBe(0);
    expect(sorted[1].uploadOrderIndex).toBe(1);
    expect(sorted[2].uploadOrderIndex).toBe(2);
    expect(sorted[0].fileName).toBe('doc.pdf');
    expect(sorted[1].fileName).toBe('img.png');
    expect(sorted[2].fileName).toBe('clip.mp4');
  });

  it('returns formErrors.files when 4 files are submitted', async () => {
    const files = Array.from({ length: 4 }, (_, i) =>
      makeFile(`f${i}.pdf`, 'application/pdf')
    );
    const fd = buildFormData(files);

    const result = await submitIdea(null, fd, testDb);

    expect(result.errors).toBeDefined();
    expect(result.errors!['files']).toBeDefined();
    const all = await testDb.select().from(ideas);
    expect(all).toHaveLength(0);
  });

  it('returns per-file error for a disallowed MIME type and no idea row is created', async () => {
    const files = [
      makeFile('ok.pdf', 'application/pdf'),
      makeFile('bad.pdf', 'application/pdf'), // magic bytes match PDF, but we'll simulate bad type via mimeDetector
    ];
    // Attach an invalid file that won't pass magic-byte detection (unknown bytes)
    const badBuffer = Buffer.alloc(4, 0x00); // no valid signature
    const badFile = new File([badBuffer], 'virus.exe', { type: 'application/x-msdownload' });
    const fd = buildFormData([files[0], badFile]);

    const result = await submitIdea(null, fd, testDb);

    // magic bytes don't match any known type, should return error
    expect(result.errors).toBeDefined();
    const all = await testDb.select().from(ideas);
    expect(all).toHaveLength(0);
  });

  it('returns formErrors.totalSize when combined file size exceeds 30 MB', async () => {
    // We can't easily build real 10 MB files; instead override validateAttachments behavior
    // by mocking the module — this is a unit-level concern tested in attachmentValidator.test.ts.
    // Here we test the wiring: submitIdea surfaces totalSize errors from validateAttachments.
    // Use 3 small files but simulate the scenario by mocking validateAttachments:
    const { validateAttachments: realValidate } = jest.requireActual<typeof import('@/lib/attachments/attachmentValidator')>('@/lib/attachments/attachmentValidator');
    const spy = jest.spyOn(
      jest.requireActual<typeof import('@/lib/attachments/attachmentValidator')>('@/lib/attachments/attachmentValidator'),
      'validateAttachments'
    );
    spy.mockReturnValueOnce({
      valid: false,
      fileErrors: {},
      formErrors: { totalSize: 'Total combined size of all attachments must be 30 MB or less' },
    });

    const fd = buildFormData([makeFile('a.pdf', 'application/pdf')]);
    const result = await submitIdea(null, fd, testDb);

    expect(result.errors?.totalSize).toBeDefined();
    spy.mockRestore();
    void realValidate; // suppress unused warning
  });

  it('returns per-file duplicate name error and does not create idea row', async () => {
    const files = [
      makeFile('dup.pdf', 'application/pdf'),
      makeFile('dup.pdf', 'application/pdf'), // same name
    ];
    const fd = buildFormData(files);

    const result = await submitIdea(null, fd, testDb);

    expect(result.errors).toBeDefined();
    const all = await testDb.select().from(ideas);
    expect(all).toHaveLength(0);
  });

  it('submits successfully with zero files (no attachment is optional)', async () => {
    const fd = buildFormData([]);

    await expect(submitIdea(null, fd, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    const [idea] = await testDb.select().from(ideas).limit(1);
    expect(idea.title).toBe('Multi-File Idea');

    const attachmentRows = await testDb.select().from(attachments).where(eq(attachments.ideaId, idea.id));
    expect(attachmentRows).toHaveLength(0);
  });
});
