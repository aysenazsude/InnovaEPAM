import { randomUUID } from 'crypto';
import { eq, and, desc, count } from 'drizzle-orm';
import { db as defaultDb, type DB } from '@/lib/db';
import {
  drafts,
  draftCategoryData,
  draftAttachments,
  type Draft,
  type NewDraft,
  type DraftAttachment,
} from '@/lib/db/schema';

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

export interface UpsertDraftInput {
  submitterId: string;
  title: string | null;
  description: string | null;
  category: string | null;
  categoryFields?: Record<string, string | null> | null;
  /** Provide to update an existing draft; omit to create a new one. */
  draftId?: string;
  /** Current version for optimistic concurrency check (required when draftId provided). */
  version?: number;
}

export type UpsertDraftResult =
  | { ok: true; draftId: string; version: number }
  | { ok: false; reason: 'conflict' | 'not_found' | 'limit_reached' };

export function countDraftsByUser(submitterId: string, dbInstance: DB = defaultDb): number {
  const [row] = dbInstance
    .select({ value: count() })
    .from(drafts)
    .where(eq(drafts.submitterId, submitterId))
    .all();
  return row?.value ?? 0;
}

export function listDraftsByUser(submitterId: string, dbInstance: DB = defaultDb): DraftSummary[] {
  const rows = dbInstance
    .select({
      id: drafts.id,
      title: drafts.title,
      updatedAt: drafts.updatedAt,
    })
    .from(drafts)
    .where(eq(drafts.submitterId, submitterId))
    .orderBy(desc(drafts.updatedAt))
    .all();

  // Fetch attachment counts individually (SQLite, simple join avoided for clarity)
  return rows.map((row) => {
    const [countRow] = dbInstance
      .select({ value: count() })
      .from(draftAttachments)
      .where(eq(draftAttachments.draftId, row.id))
      .all();
    return {
      id: row.id,
      title: row.title,
      updatedAt: row.updatedAt,
      attachmentCount: countRow?.value ?? 0,
    };
  });
}

export function getDraftDetail(
  draftId: string,
  submitterId: string,
  dbInstance: DB = defaultDb
): DraftDetail | null {
  const [draft] = dbInstance
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.submitterId, submitterId)))
    .all();

  if (!draft) return null;

  const [catData] = dbInstance
    .select()
    .from(draftCategoryData)
    .where(eq(draftCategoryData.draftId, draftId))
    .all();

  const attachmentRows = dbInstance
    .select()
    .from(draftAttachments)
    .where(eq(draftAttachments.draftId, draftId))
    .orderBy(draftAttachments.uploadOrderIndex)
    .all();

  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    categoryFields: catData ? (catData.fields as Record<string, string | null>) : null,
    version: draft.version,
    updatedAt: draft.updatedAt,
    attachments: attachmentRows.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: a.fileSize,
      storagePath: a.storagePath,
      uploadOrderIndex: a.uploadOrderIndex,
    })),
  };
}

export function upsertDraft(
  input: UpsertDraftInput,
  maxDrafts: number,
  dbInstance: DB = defaultDb
): UpsertDraftResult {
  const now = Math.floor(Date.now() / 1000);

  return dbInstance.transaction((tx) => {
    if (input.draftId) {
      // UPDATE path
      const [existing] = tx
        .select({ version: drafts.version })
        .from(drafts)
        .where(
          and(
            eq(drafts.id, input.draftId),
            eq(drafts.submitterId, input.submitterId)
          )
        )
        .all();

      if (!existing) return { ok: false, reason: 'not_found' };
      if (existing.version !== input.version) return { ok: false, reason: 'conflict' };

      const newVersion = existing.version + 1;

      tx.update(drafts)
        .set({
          title: input.title,
          description: input.description,
          category: input.category,
          version: newVersion,
          updatedAt: now,
        })
        .where(eq(drafts.id, input.draftId))
        .run();

      if (input.category && input.categoryFields) {
        // upsert category data
        const [existingCat] = tx
          .select({ draftId: draftCategoryData.draftId })
          .from(draftCategoryData)
          .where(eq(draftCategoryData.draftId, input.draftId))
          .all();

        if (existingCat) {
          tx.update(draftCategoryData)
            .set({ category: input.category, fields: input.categoryFields })
            .where(eq(draftCategoryData.draftId, input.draftId))
            .run();
        } else {
          tx.insert(draftCategoryData)
            .values({
              draftId: input.draftId,
              category: input.category,
              fields: input.categoryFields,
              createdAt: now,
            })
            .run();
        }
      } else if (!input.category) {
        // category cleared — remove stale category data
        tx.delete(draftCategoryData).where(eq(draftCategoryData.draftId, input.draftId)).run();
      }

      return { ok: true, draftId: input.draftId, version: newVersion };
    } else {
      // CREATE path
      const [countRow] = tx
        .select({ value: count() })
        .from(drafts)
        .where(eq(drafts.submitterId, input.submitterId))
        .all();

      if ((countRow?.value ?? 0) >= maxDrafts) {
        return { ok: false, reason: 'limit_reached' };
      }

      const newId = randomUUID();

      tx.insert(drafts)
        .values({
          id: newId,
          submitterId: input.submitterId,
          title: input.title,
          description: input.description,
          category: input.category,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      if (input.category && input.categoryFields) {
        tx.insert(draftCategoryData)
          .values({
            draftId: newId,
            category: input.category,
            fields: input.categoryFields,
            createdAt: now,
          })
          .run();
      }

      return { ok: true, draftId: newId, version: 1 };
    }
  });
}

export function deleteDraftById(
  draftId: string,
  submitterId: string,
  dbInstance: DB = defaultDb
): { deleted: boolean; storagePaths: string[] } {
  // Collect attachment paths before deletion (cascade will remove attachment rows)
  const attachmentRows = dbInstance
    .select({ storagePath: draftAttachments.storagePath })
    .from(draftAttachments)
    .where(eq(draftAttachments.draftId, draftId))
    .all();

  const result = dbInstance
    .delete(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.submitterId, submitterId)))
    .run();

  return {
    deleted: result.changes > 0,
    storagePaths: attachmentRows.map((a) => a.storagePath),
  };
}
