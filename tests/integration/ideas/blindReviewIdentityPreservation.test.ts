import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { advanceIdeaToStage } from '../../helpers/pipelineHelpers';
import { ideas, stageTransitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { toAdminIdeaView } from '@/lib/ideas/anonymize';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${url};200;` });
  }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

describe('Blind Review — submitter identity preservation', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  // ── US2: Identity preserved through Phase 1 evaluation ─────────────────────

  describe('US2 — Phase 1 accept/reject does not alter submitterId', () => {
    it('should preserve submitterId in DB after admin accepts an idea', async () => {
      // Arrange
      const admin = await loginAs(testDb, 'admin');
      const submitter = await loginAs(testDb, 'submitter');
      const originalSubmitterId = submitter.id;
      const idea = await submitIdea(testDb, originalSubmitterId);

      // Act — simulate acceptance (update status + comment as evaluation.ts does)
      const now = Math.floor(Date.now() / 1000);
      await testDb
        .update(ideas)
        .set({ status: 'accepted', adminComment: 'Well done', evaluatingAdminId: admin.id, evaluatedAt: now })
        .where(eq(ideas.id, idea.id));

      // Assert — submitterId is unchanged
      const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
      expect(updated.submitterId).toBe(originalSubmitterId);
      expect(updated.status).toBe('accepted');
    });

    it('should preserve submitterId in DB after admin rejects an idea', async () => {
      // Arrange
      const admin = await loginAs(testDb, 'admin');
      const submitter = await loginAs(testDb, 'submitter');
      const originalSubmitterId = submitter.id;
      const idea = await submitIdea(testDb, originalSubmitterId);

      // Act — simulate rejection
      const now = Math.floor(Date.now() / 1000);
      await testDb
        .update(ideas)
        .set({ status: 'rejected', adminComment: 'Not feasible', evaluatingAdminId: admin.id, evaluatedAt: now })
        .where(eq(ideas.id, idea.id));

      // Assert — submitterId is unchanged
      const [updated] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
      expect(updated.submitterId).toBe(originalSubmitterId);
      expect(updated.status).toBe('rejected');
    });
  });

  // ── US3: Identity preserved through full pipeline lifecycle ────────────────

  describe('US3 — submitterId preserved through full pipeline; stage_transitions contain no submitter data', () => {
    it('should keep submitterId unchanged after advancing through all pipeline stages', async () => {
      // Arrange
      const admin = await loginAs(testDb, 'admin');
      const submitter = await loginAs(testDb, 'submitter');
      const originalSubmitterId = submitter.id;
      const idea = await submitIdea(testDb, originalSubmitterId);

      // Act — advance through all stages: screening → technical_review → business_review → final_decision
      await advanceIdeaToStage(testDb, idea.id, admin.id, 'final_decision');

      // Then approve at final_decision
      await testDb
        .update(ideas)
        .set({ status: 'approved' })
        .where(eq(ideas.id, idea.id));

      // Assert (a) — submitterId is unchanged on the idea record
      const [finalIdea] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
      expect(finalIdea.submitterId).toBe(originalSubmitterId);
      expect(finalIdea.status).toBe('approved');
    });

    it('should not write submitterId into any stage_transitions row', async () => {
      // Arrange
      const admin = await loginAs(testDb, 'admin');
      const submitter = await loginAs(testDb, 'submitter');
      const idea = await submitIdea(testDb, submitter.id);

      // Act — advance to final_decision creating 4 transition rows
      await advanceIdeaToStage(testDb, idea.id, admin.id, 'final_decision');

      // Assert (b) — all transition rows contain adminId, NOT submitterId
      const transitions = await testDb
        .select()
        .from(stageTransitions)
        .where(eq(stageTransitions.ideaId, idea.id));

      expect(transitions.length).toBeGreaterThan(0);
      for (const t of transitions) {
        // adminId must be set to the reviewing admin
        expect(t.adminId).toBe(admin.id);
        // The stageTransitions schema has no submitterId column;
        // verify the object does not inadvertently carry it
        expect(t).not.toHaveProperty('submitterId');
      }
    });

    it('should produce an AdminIdeaView with no submitterId after full pipeline', async () => {
      // Arrange
      const admin = await loginAs(testDb, 'admin');
      const submitter = await loginAs(testDb, 'submitter');
      const idea = await submitIdea(testDb, submitter.id);
      await advanceIdeaToStage(testDb, idea.id, admin.id, 'final_decision');
      await testDb.update(ideas).set({ status: 'approved' }).where(eq(ideas.id, idea.id));

      // Retrieve full idea record as getAdminIdeas() would
      const [fullIdea] = await testDb.select().from(ideas).where(eq(ideas.id, idea.id));
      const ideaWithAttachments = { ...fullIdea, attachments: [], categoryData: null };

      // Act (c) — apply display-layer anonymisation
      const adminView = toAdminIdeaView(ideaWithAttachments);

      // Assert (c) — submitterId absent from admin view
      expect(adminView).not.toHaveProperty('submitterId');
      // All other fields present
      expect(adminView.status).toBe('approved');
      expect(adminView.id).toBe(idea.id);
    });
  });
});
