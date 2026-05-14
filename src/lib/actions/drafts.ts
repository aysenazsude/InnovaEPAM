'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db, type DB } from '@/lib/db';
import {
  ideas,
  ideaCategoryData,
  attachments,
  drafts,
  draftAttachments,
  draftCategoryData,
} from '@/lib/db/schema';
import { validateDraftSave } from '@/lib/drafts/draftValidator';
import { validateIdea } from '@/lib/ideas/ideaValidator';
import { validateAttachments, type AttachmentFileInput } from '@/lib/attachments/attachmentValidator';
import { detectMimeType } from '@/lib/attachments/mimeDetector';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';
import { deleteFile } from '@/lib/storage';
import { MAX_DRAFTS_PER_USER, type CategorySlug } from '@/lib/constants';
import {
  upsertDraft,
  listDraftsByUser,
  getDraftDetail,
  deleteDraftById,
  type DraftSummary,
  type DraftDetail,
} from '@/lib/drafts/draftRepository';
import { and, eq } from 'drizzle-orm';
import path from 'node:path';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface SaveDraftResult {
  success?: true;
  draftId?: string;
  version?: number;
  errors?: Record<string, string>;
  limitReached?: true;
  conflict?: true;
}

export interface DeleteDraftResult {
  success?: true;
  errors?: Record<string, string>;
}

export interface SubmitDraftResult {
  errors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// saveDraft
// ---------------------------------------------------------------------------

export async function saveDraft(
  _prevState: SaveDraftResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<SaveDraftResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const submitterId = session.user.id!;
  const rawTitle = formData.get('title') as string | null;
  const rawDescription = formData.get('description') as string | null;
  const rawCategory = formData.get('category') as string | null;
  const rawDraftId = formData.get('draftId') as string | null;
  const rawVersion = formData.get('version') as string | null;

  const title = rawTitle && rawTitle.trim().length > 0 ? rawTitle.trim() : null;
  const description = rawDescription && rawDescription.trim().length > 0 ? rawDescription.trim() : null;
  const category = rawCategory && rawCategory.trim().length > 0 ? rawCategory.trim() : null;

  const validation = validateDraftSave({ title, description, category });
  if (!validation.valid) {
    return { errors: validation.errors };
  }

  // Extract whitelisted category-specific fields
  let categoryFields: Record<string, string | null> | null = null;
  if (category) {
    const fieldDefs = CATEGORY_FIELDS[category as CategorySlug] ?? [];
    if (fieldDefs.length > 0) {
      categoryFields = {};
      for (const fieldDef of fieldDefs) {
        const val = formData.get(fieldDef.name);
        categoryFields[fieldDef.name] = typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;
      }
    }
  }

  const result = upsertDraft(
    {
      submitterId,
      title,
      description,
      category,
      categoryFields,
      draftId: rawDraftId ?? undefined,
      version: rawVersion != null ? parseInt(rawVersion, 10) : undefined,
    },
    MAX_DRAFTS_PER_USER,
    dbInstance
  );

  if (!result.ok) {
    if (result.reason === 'limit_reached') return { limitReached: true };
    if (result.reason === 'conflict') return { conflict: true };
    return { errors: { form: 'Draft not found.' } };
  }

  return { success: true, draftId: result.draftId, version: result.version };
}

// ---------------------------------------------------------------------------
// getDrafts
// ---------------------------------------------------------------------------

export async function getDrafts(dbInstance: DB = db): Promise<DraftSummary[]> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  return listDraftsByUser(session.user.id!, dbInstance);
}

// ---------------------------------------------------------------------------
// getDraft
// ---------------------------------------------------------------------------

export async function getDraft(draftId: string, dbInstance: DB = db): Promise<DraftDetail | null> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  return getDraftDetail(draftId, session.user.id!, dbInstance);
}

// ---------------------------------------------------------------------------
// deleteDraft
// ---------------------------------------------------------------------------

export async function deleteDraft(
  draftId: string,
  dbInstance: DB = db
): Promise<DeleteDraftResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { deleted, storagePaths } = deleteDraftById(draftId, session.user.id!, dbInstance);

  if (!deleted) {
    return { errors: { form: 'Draft not found or already deleted.' } };
  }

  // Clean up stored files (non-blocking; ignore individual errors)
  for (const storagePath of storagePaths) {
    try {
      deleteFile(storagePath, UPLOAD_DIR);
    } catch {
      // ignore cleanup errors
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// submitDraftAsIdea
// ---------------------------------------------------------------------------

export async function submitDraftAsIdea(
  draftId: string,
  dbInstance: DB = db
): Promise<SubmitDraftResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const submitterId = session.user.id!;
  const draft = getDraftDetail(draftId, submitterId, dbInstance);

  if (!draft) {
    return { errors: { form: 'Draft not found.' } };
  }

  const categoryFields = draft.categoryFields ?? undefined;
  const validation = validateIdea({
    title: draft.title ?? '',
    description: draft.description ?? '',
    category: draft.category ?? '',
    categoryFields: categoryFields as Record<string, string> | undefined,
  });

  if (!validation.valid) {
    return { errors: validation.errors };
  }

  const ideaId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const draftAttachmentRows = dbInstance
    .select()
    .from(draftAttachments)
    .where(eq(draftAttachments.draftId, draftId))
    .orderBy(draftAttachments.uploadOrderIndex)
    .all();

  // Validate attachment constraints for submission
  const fileInputs: AttachmentFileInput[] = draftAttachmentRows.map((a) => ({
    name: a.fileName,
    mimeType: a.fileType,
    sizeBytes: a.fileSize,
  }));

  if (fileInputs.length > 0) {
    const attachValidation = validateAttachments(fileInputs);
    if (!attachValidation.valid) {
      const errors: Record<string, string> = {
        ...attachValidation.formErrors,
        ...attachValidation.fileErrors,
      };
      return { errors };
    }
  }

  dbInstance.transaction((tx) => {
    tx.insert(ideas)
      .values({
        id: ideaId,
        numericId: Math.floor(Math.random() * 2_000_000_000),
        submitterId,
        title: draft.title!.trim(),
        description: draft.description!.trim(),
        category: draft.category!,
        status: 'submitted',
        submittedAt: now,
      })
      .run();

    // Copy category data if present
    if (draft.category && draft.categoryFields) {
      tx.insert(ideaCategoryData)
        .values({
          ideaId,
          category: draft.category,
          fields: draft.categoryFields,
          createdAt: now,
        })
        .run();
    }

    // Copy attachments from draft to idea
    for (let i = 0; i < draftAttachmentRows.length; i++) {
      const a = draftAttachmentRows[i];
      tx.insert(attachments)
        .values({
          id: crypto.randomUUID(),
          ideaId,
          fileName: a.fileName,
          fileType: a.fileType,
          fileSize: a.fileSize,
          storagePath: a.storagePath,
          uploadOrderIndex: a.uploadOrderIndex,
          uploadedAt: a.uploadedAt,
        })
        .run();
    }

    // Delete the draft (cascade deletes draft_category_data and draft_attachments rows)
    tx.delete(drafts).where(and(eq(drafts.id, draftId), eq(drafts.submitterId, submitterId))).run();
  });

  redirect(`/ideas/${ideaId}`);
}
