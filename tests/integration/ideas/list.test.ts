import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { attachFile } from '../../helpers/attachmentHelpers';
import { getMyIdeas, getIdeaById, getAdminIdeas } from '@/lib/actions/ideas';
import { ideas, ideaCategoryData } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

// Mock 3rd-party boundaries: NextAuth + Next.js framework
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));

describe('getMyIdeas / getIdeaById / getAdminIdeas server actions', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should return only the submitter\'s own ideas', async () => {
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    await submitIdea(testDb, alice.id, { title: 'Alice Idea 1' });
    await submitIdea(testDb, alice.id, { title: 'Alice Idea 2' });
    await submitIdea(testDb, bob.id, { title: 'Bob Idea' });

    const aliceIdeas = await getMyIdeas(testDb);

    expect(aliceIdeas).toHaveLength(2);
    aliceIdeas.forEach((idea) => expect(idea.submitterId).toBe(alice.id));
  });

  it('should return empty array when submitter has no ideas', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    const result = await getMyIdeas(testDb);

    expect(result).toEqual([]);
  });

  it('should include attachments array (empty when no attachment)', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    await submitIdea(testDb, alice.id, { title: 'No Attachment Idea' });

    const [idea] = await getMyIdeas(testDb);

    expect(idea.attachments).toEqual([]);
  });

  it('should redirect to /login when session is missing for getMyIdeas', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    await expect(getMyIdeas(testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should return all ideas for admin', async () => {
    const admin = await loginAs(testDb, 'admin');
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    await submitIdea(testDb, alice.id);
    await submitIdea(testDb, bob.id);

    const allIdeas = await getAdminIdeas(testDb);

    expect(allIdeas).toHaveLength(2);
  });

  it('should redirect to /ideas when non-admin calls getAdminIdeas', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    await expect(getAdminIdeas(testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should redirect to /login when session is missing for getAdminIdeas', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    await expect(getAdminIdeas(testDb)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });
  });

  it('should return correct idea for the owner', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id, { title: 'Special Idea' });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.title).toBe('Special Idea');
    expect(found?.attachments).toEqual([]);
  });

  it('should return null for an idea belonging to another submitter', async () => {
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const bobIdea = await submitIdea(testDb, bob.id, { title: 'Bob Private Idea' });

    const found = await getIdeaById(bobIdea.id, testDb);

    expect(found).toBeNull();
  });

  it('should return null when idea does not exist', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    const found = await getIdeaById('does-not-exist', testDb);

    expect(found).toBeNull();
  });

  it('should allow admin to get any idea by id', async () => {
    const admin = await loginAs(testDb, 'admin');
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });
    const idea = await submitIdea(testDb, alice.id, { title: 'Alice Idea' });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.title).toBe('Alice Idea');
  });

  it('should reflect status changes in subsequent fetch', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id);

    await testDb.update(ideas).set({ status: 'under_review' }).where(eq(ideas.id, idea.id));

    const updated = await getIdeaById(idea.id, testDb);
    expect(updated?.status).toBe('under_review');
  });
});

describe('getIdeaById — categoryData join', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('should return null categoryData when no category fields were submitted', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id, { category: 'other' });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.categoryData).toBeNull();
  });

  it('should return categoryData with fields when present', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id, { category: 'process_improvement' });

    // Manually insert category data row
    await testDb.insert(ideaCategoryData).values({
      ideaId: idea.id,
      category: 'process_improvement',
      fields: { affected_team: 'Platform', current_pain_point: 'Slow deploys.' },
      createdAt: Math.floor(Date.now() / 1000),
    });

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.categoryData).not.toBeNull();
    expect(found?.categoryData?.fields).toMatchObject({ affected_team: 'Platform' });
  });
});

describe('getMyIdeas / getIdeaById / getAdminIdeas — multi-attachment (Phase 3)', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('returns all 3 attachments ordered by uploadOrderIndex for getIdeaById', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id);

    // Insert 3 attachments in reverse order to verify sorting
    await attachFile(testDb, idea.id, 'video/mp4', 500_000, 2);
    await attachFile(testDb, idea.id, 'image/png', 100_000, 1);
    await attachFile(testDb, idea.id, 'application/pdf', 200_000, 0);

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.attachments).toHaveLength(3);
    expect(found?.attachments[0].uploadOrderIndex).toBe(0);
    expect(found?.attachments[1].uploadOrderIndex).toBe(1);
    expect(found?.attachments[2].uploadOrderIndex).toBe(2);
    expect(found?.attachments[0].fileType).toBe('application/pdf');
    expect(found?.attachments[1].fileType).toBe('image/png');
    expect(found?.attachments[2].fileType).toBe('video/mp4');
  });

  it('returns empty attachments array for idea with no attachments', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id);

    const found = await getIdeaById(idea.id, testDb);

    expect(found?.attachments).toEqual([]);
  });

  it('getMyIdeas returns all attachments for idea with 3 files', async () => {
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });
    const idea = await submitIdea(testDb, alice.id, { title: 'Three Files' });

    await attachFile(testDb, idea.id, 'application/pdf', 100_000, 0);
    await attachFile(testDb, idea.id, 'image/jpeg', 200_000, 1);
    await attachFile(testDb, idea.id, 'video/mp4', 300_000, 2);

    const myIdeas = await getMyIdeas(testDb);
    const found = myIdeas.find((i) => i.id === idea.id);

    expect(found?.attachments).toHaveLength(3);
  });

  it('getAdminIdeas returns attachments[] for all ideas', async () => {
    const admin = await loginAs(testDb, 'admin');
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    const idea1 = await submitIdea(testDb, alice.id, { title: 'Idea 1' });
    const idea2 = await submitIdea(testDb, alice.id, { title: 'Idea 2' });

    await attachFile(testDb, idea1.id, 'application/pdf', 100_000, 0);
    await attachFile(testDb, idea1.id, 'image/png', 50_000, 1);

    const adminIdeas = await getAdminIdeas(testDb);
    const found1 = adminIdeas.find((i) => i.id === idea1.id);
    const found2 = adminIdeas.find((i) => i.id === idea2.id);

    expect(found1?.attachments).toHaveLength(2);
    expect(found2?.attachments).toHaveLength(0);
  });
});
