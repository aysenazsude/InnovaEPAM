import type { Draft, DraftCategoryData, DraftAttachment } from '@/lib/db/schema';

let draftCounter = 1;

function makeTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export interface DraftSummary {
  id: string;
  title: string | null;
  updatedAt: number;
  attachmentCount: number;
}

export interface DraftDetail {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  categoryFields: Record<string, string | null> | null;
  version: number;
  updatedAt: number;
  attachments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    uploadOrderIndex: number;
  }>;
}

export function createDraft(overrides: Partial<Draft> = {}): Draft {
  const n = draftCounter++;
  const now = makeTimestamp();
  return {
    id: overrides.id ?? `DRAFT-${String(n).padStart(4, '0')}`,
    submitterId: overrides.submitterId ?? `user-submitter-${n}`,
    title: overrides.title !== undefined ? overrides.title : `Test Draft ${n}`,
    description: overrides.description !== undefined ? overrides.description : `Description for draft ${n}`,
    category: overrides.category !== undefined ? overrides.category : null,
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

export function createDraftSummary(overrides: Partial<DraftSummary> = {}): DraftSummary {
  const n = draftCounter++;
  const now = makeTimestamp();
  return {
    id: overrides.id ?? `DRAFT-${String(n).padStart(4, '0')}`,
    title: overrides.title !== undefined ? overrides.title : `Test Draft ${n}`,
    updatedAt: overrides.updatedAt ?? now,
    attachmentCount: overrides.attachmentCount ?? 0,
  };
}

export function createDraftDetail(overrides: Partial<DraftDetail> = {}): DraftDetail {
  const n = draftCounter++;
  const now = makeTimestamp();
  return {
    id: overrides.id ?? `DRAFT-${String(n).padStart(4, '0')}`,
    title: overrides.title !== undefined ? overrides.title : `Test Draft ${n}`,
    description: overrides.description !== undefined ? overrides.description : `Description for draft ${n}`,
    category: overrides.category !== undefined ? overrides.category : null,
    categoryFields: overrides.categoryFields !== undefined ? overrides.categoryFields : null,
    version: overrides.version ?? 1,
    updatedAt: overrides.updatedAt ?? now,
    attachments: overrides.attachments ?? [],
  };
}

export function createDraftAttachment(
  draftId: string,
  overrides: Partial<DraftAttachment> = {}
): DraftAttachment {
  const n = draftCounter++;
  const now = makeTimestamp();
  return {
    id: overrides.id ?? `DATTACH-${String(n).padStart(4, '0')}`,
    draftId,
    fileName: overrides.fileName ?? `test-file-${n}.pdf`,
    fileType: overrides.fileType ?? 'application/pdf',
    fileSize: overrides.fileSize ?? 1024,
    storagePath: overrides.storagePath ?? `test-storage-path-${n}.pdf`,
    uploadOrderIndex: overrides.uploadOrderIndex ?? 0,
    uploadedAt: overrides.uploadedAt ?? now,
  };
}
