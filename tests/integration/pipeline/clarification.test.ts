import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import {
  requestClarification,
  cancelClarification,
  respondToClarification,
} from '@/lib/actions/pipeline';
import { advanceIdeaToStage } from '../../helpers/pipelineHelpers';
import { ideas, clarificationRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), {
      digest: `NEXT_REDIRECT;replace;${url};200;`,
    });
  }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('clarification integration', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  it('requestClarification: sets idea to awaiting_clarification and creates request', async () => {
    const admin = await loginAs(testDb, 'admin');
    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);

    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'screening');

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening');
    formData.set('question', 'Can you provide more details?');
    formData.set('notes', 'Need clarification before proceeding');

    const result = await requestClarification(null, formData, testDb);

    expect(result).toEqual({});

    const [updatedIdea] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updatedIdea.status).toBe('awaiting_clarification');
    expect(updatedIdea.activeClarificationId).toBeTruthy();

    const requests = await testDb.select().from(clarificationRequests).where(eq(clarificationRequests.ideaId, idea.id));
    expect(requests).toHaveLength(1);
    expect(requests[0].question).toBe('Can you provide more details?');
    expect(requests[0].response).toBeNull();
  });

  it('requestClarification: conflict when status does not match expectedStatus', async () => {
    const admin = await loginAs(testDb, 'admin');
    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);

    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'technical_review');

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening'); // wrong
    formData.set('question', 'What do you mean?');
    formData.set('notes', 'Internal notes');

    const result = await requestClarification(null, formData, testDb);

    expect(result).toEqual({ conflict: true });
  });

  it('requestClarification: returns error if question is empty', async () => {
    const admin = await loginAs(testDb, 'admin');
    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);

    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'screening');

    const formData = new FormData();
    formData.set('ideaId', idea.id);
    formData.set('expectedStatus', 'screening');
    formData.set('question', '');
    formData.set('notes', 'Some notes');

    const result = await requestClarification(null, formData, testDb);

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it('cancelClarification: reverts idea to previous stage and marks clarification cancelled', async () => {
    const admin = await loginAs(testDb, 'admin');
    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);

    const submitter = await loginAs(testDb, 'submitter');
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'screening');

    // Request clarification
    const reqFormData = new FormData();
    reqFormData.set('ideaId', idea.id);
    reqFormData.set('expectedStatus', 'screening');
    reqFormData.set('question', 'Need more info');
    reqFormData.set('notes', 'Pausing for clarification');
    await requestClarification(null, reqFormData, testDb);

    const [ideaWithClarif] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    const clarificationId = ideaWithClarif.activeClarificationId!;

    // Cancel
    const cancelFormData = new FormData();
    cancelFormData.set('ideaId', idea.id);
    cancelFormData.set('clarificationId', clarificationId);
    cancelFormData.set('notes', 'No longer needed');

    const result = await cancelClarification(null, cancelFormData, testDb);

    expect(result).toEqual({});

    const [updatedIdea] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updatedIdea.status).toBe('screening');
    expect(updatedIdea.activeClarificationId).toBeNull();

    const [clarif] = await testDb.select().from(clarificationRequests).where(eq(clarificationRequests.id, clarificationId));
    expect(clarif.cancelledAt).not.toBeNull();
  });

  it('respondToClarification: submitter can respond and idea reverts to previous stage', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');

    // Admin requests clarification
    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'technical_review');

    const reqFormData = new FormData();
    reqFormData.set('ideaId', idea.id);
    reqFormData.set('expectedStatus', 'technical_review');
    reqFormData.set('question', 'What is the ROI?');
    reqFormData.set('notes', 'Need financial details');
    await requestClarification(null, reqFormData, testDb);

    const [ideaWithClarif] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    const clarificationId = ideaWithClarif.activeClarificationId!;

    // Submitter responds
    mockAuth.mockResolvedValue({ user: submitter } as Awaited<ReturnType<typeof auth>>);

    const respFormData = new FormData();
    respFormData.set('ideaId', idea.id);
    respFormData.set('clarificationId', clarificationId);
    respFormData.set('response', 'Expected ROI is 20% in 12 months');

    const result = await respondToClarification(null, respFormData, testDb);

    expect(result).toEqual({});

    const [updatedIdea] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    expect(updatedIdea.status).toBe('technical_review');
    expect(updatedIdea.activeClarificationId).toBeNull();

    const [clarif] = await testDb.select().from(clarificationRequests).where(eq(clarificationRequests.id, clarificationId));
    expect(clarif.response).toBe('Expected ROI is 20% in 12 months');
    expect(clarif.responderId).toBe(submitter.id);
  });

  it('respondToClarification: non-submitter cannot respond', async () => {
    const admin = await loginAs(testDb, 'admin');
    const submitter = await loginAs(testDb, 'submitter');
    const otherUser = await loginAs(testDb, 'submitter');

    mockAuth.mockResolvedValue({ user: admin } as Awaited<ReturnType<typeof auth>>);
    const idea = await submitIdea(testDb, submitter.id);
    await advanceIdeaToStage(testDb, idea.id, admin.id, 'screening');

    const reqFormData = new FormData();
    reqFormData.set('ideaId', idea.id);
    reqFormData.set('expectedStatus', 'screening');
    reqFormData.set('question', 'Is this a process idea?');
    reqFormData.set('notes', 'Needs clarification');
    await requestClarification(null, reqFormData, testDb);

    const [ideaWithClarif] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
    const clarificationId = ideaWithClarif.activeClarificationId!;

    // Other user tries to respond
    mockAuth.mockResolvedValue({ user: otherUser } as Awaited<ReturnType<typeof auth>>);

    const respFormData = new FormData();
    respFormData.set('ideaId', idea.id);
    respFormData.set('clarificationId', clarificationId);
    respFormData.set('response', 'Unauthorized response');

    const result = await respondToClarification(null, respFormData, testDb);

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});
