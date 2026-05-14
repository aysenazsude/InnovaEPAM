import { describe, it, expect } from '@jest/globals';
import { toAdminIdeaView, type AdminIdeaView } from '@/lib/ideas/anonymize';
import type { IdeaWithAttachments } from '@/lib/actions/ideas';

const baseIdea: IdeaWithAttachments = {
  id: 'idea-001',
  numericId: 1001,
  title: 'A great idea',
  description: 'Detailed description here.',
  category: 'technical_innovation',
  status: 'submitted',
  submitterId: 'user-secret-uuid',
  submittedAt: 1_700_000_000,
  adminComment: null,
  evaluatingAdminId: null,
  evaluatedAt: null,
  activeClarificationId: null,
  attachments: [],
  categoryData: null,
};

describe('toAdminIdeaView', () => {
  it('should omit submitterId from the returned object', () => {
    const result = toAdminIdeaView(baseIdea);
    expect(result).not.toHaveProperty('submitterId');
  });

  it('should preserve all other IdeaWithAttachments fields', () => {
    const result = toAdminIdeaView(baseIdea);
    expect(result.id).toBe('idea-001');
    expect(result.numericId).toBe(1001);
    expect(result.title).toBe('A great idea');
    expect(result.description).toBe('Detailed description here.');
    expect(result.category).toBe('technical_innovation');
    expect(result.status).toBe('submitted');
    expect(result.submittedAt).toBe(1_700_000_000);
    expect(result.adminComment).toBeNull();
    expect(result.evaluatingAdminId).toBeNull();
    expect(result.activeClarificationId).toBeNull();
    expect(result.attachments).toEqual([]);
    expect(result.categoryData).toBeNull();
  });

  it('should not mutate the original idea object', () => {
    const original = { ...baseIdea };
    toAdminIdeaView(baseIdea);
    expect(baseIdea).toEqual(original);
    expect(baseIdea.submitterId).toBe('user-secret-uuid');
  });

  it('should satisfy the AdminIdeaView type contract', () => {
    const result: AdminIdeaView = toAdminIdeaView(baseIdea);
    // If this compiles, the type constraint is enforced
    expect(result).toBeDefined();
  });

  it('should work correctly for ideas with attachments and categoryData', () => {
    const ideaWithExtras: IdeaWithAttachments = {
      ...baseIdea,
      attachments: [
        {
          id: 'att-1',
          ideaId: 'idea-001',
          fileName: 'doc.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          storagePath: '/uploads/doc.pdf',
          uploadedAt: 1_700_000_100,
          uploadOrderIndex: 0,
        },
      ],
      categoryData: {
        ideaId: 'idea-001',
        category: 'technical_innovation',
        fields: { tool: 'React' },
        createdAt: 1_700_000_000,
      },
    };
    const result = toAdminIdeaView(ideaWithExtras);
    expect(result).not.toHaveProperty('submitterId');
    expect(result.attachments).toHaveLength(1);
    expect(result.categoryData).not.toBeNull();
  });
});
