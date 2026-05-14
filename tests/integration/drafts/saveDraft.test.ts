import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { createDraftInDb } from '../../helpers/draftHelpers';
import { drafts, draftCategoryData, draftAttachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveDraft } from '@/lib/actions/drafts';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));
jest.mock('@/lib/storage', () => ({
  saveFile: jest.fn().mockReturnValue('mock-storage-path.pdf'),
  deleteFile: jest.fn(),
}));

describe('saveDraft server action', () => {
  let testDb: ReturnType<typeof createTestDb>;
  let submitter: Awaited<ReturnType<typeof loginAs>>;

  beforeEach(async () => {
    testDb = createTestDb();
    submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });
  });

  it('should create a new draft with title and description', async () => {
    const formData = new FormData();
    formData.set('title', 'My New Draft');
    formData.set('description', 'Draft description');

    const result = await saveDraft(null, formData, testDb);

    expect(result.success).toBe(true);
    expect(result.draftId).toBeDefined();
    expect(result.version).toBe(1);

    const [draft] = await testDb.select().from(drafts).where(eq(drafts.submitterId, submitter.id));
    expect(draft.title).toBe('My New Draft');
    expect(draft.description).toBe('Draft description');
  });

  it('should save a draft with null title when title is empty', async () => {
    const formData = new FormData();
    formData.set('title', '');
    formData.set('description', 'Some description');

    const result = await saveDraft(null, formData, testDb);

    expect(result.success).toBe(true);
    const [draft] = await testDb.select().from(drafts).where(eq(drafts.submitterId, submitter.id));
    expect(draft.title).toBeNull();
  });

  it('should save category and category-specific fields', async () => {
    const formData = new FormData();
    formData.set('title', 'Technical Draft');
    formData.set('category', 'technical_innovation');
    formData.set('technology_area', 'Backend');

    const result = await saveDraft(null, formData, testDb);

    expect(result.success).toBe(true);
    const [catData] = await testDb
      .select()
      .from(draftCategoryData)
      .where(eq(draftCategoryData.draftId, result.draftId!));
    expect(catData.category).toBe('technical_innovation');
    expect((catData.fields as Record<string, string>)['technology_area']).toBe('Backend');
  });

  it('should return limitReached when user already has 10 drafts', async () => {
    for (let i = 0; i < 10; i++) {
      await createDraftInDb(testDb, submitter.id, { title: `Draft ${i}` });
    }
    const formData = new FormData();
    formData.set('title', 'One Too Many');

    const result = await saveDraft(null, formData, testDb);

    expect(result.limitReached).toBe(true);
    expect(result.success).toBeUndefined();
  });

  it('should update an existing draft and increment version', async () => {
    const existing = await createDraftInDb(testDb, submitter.id, { title: 'Old Title', version: 1 });

    const formData = new FormData();
    formData.set('draftId', existing.id);
    formData.set('version', '1');
    formData.set('title', 'Updated Title');

    const result = await saveDraft(null, formData, testDb);

    expect(result.success).toBe(true);
    expect(result.version).toBe(2);

    const [updated] = await testDb.select().from(drafts).where(eq(drafts.id, existing.id));
    expect(updated.title).toBe('Updated Title');
    expect(updated.version).toBe(2);
  });

  it('should return conflict when version does not match', async () => {
    const existing = await createDraftInDb(testDb, submitter.id, { title: 'Draft', version: 2 });

    const formData = new FormData();
    formData.set('draftId', existing.id);
    formData.set('version', '1'); // stale
    formData.set('title', 'Conflicting Update');

    const result = await saveDraft(null, formData, testDb);

    expect(result.conflict).toBe(true);
    expect(result.success).toBeUndefined();
  });

  it('should redirect to login when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const formData = new FormData();
    formData.set('title', 'Draft');

    await expect(saveDraft(null, formData, testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should return error for title exceeding 200 characters', async () => {
    const formData = new FormData();
    formData.set('title', 'A'.repeat(201));

    const result = await saveDraft(null, formData, testDb);

    expect(result.errors?.title).toBeDefined();
    const all = await testDb.select().from(drafts);
    expect(all).toHaveLength(0);
  });
});
