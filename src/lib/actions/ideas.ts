'use server';

import { auth } from '@/auth';
import { db, type DB } from '@/lib/db';
import { ideas, attachments, ideaCategoryData, Idea, Attachment, IdeaCategoryData } from '@/lib/db/schema';
import { validateIdea } from '@/lib/ideas/ideaValidator';
import { validateAttachments, type AttachmentFileInput } from '@/lib/attachments/attachmentValidator';
import { detectMimeType } from '@/lib/attachments/mimeDetector';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';
import { saveFile, deleteFile } from '@/lib/storage';
import { redirect } from 'next/navigation';
import { eq, desc, asc } from 'drizzle-orm';
import path from 'node:path';
import { CategorySlug } from '@/lib/constants';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');

export interface SubmitIdeaResult {
  errors?: Record<string, string>;
}

export async function submitIdea(
  _prevState: SubmitIdeaResult | null,
  formData: FormData,
  dbInstance: DB = db
): Promise<SubmitIdeaResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const input = {
    title: (formData.get('title') as string) ?? '',
    description: (formData.get('description') as string) ?? '',
    category: (formData.get('category') as string) ?? '',
  };

  // Extract whitelisted category-specific fields from FormData
  const categorySlug = input.category as CategorySlug;
  const fieldDefs = CATEGORY_FIELDS[categorySlug] ?? [];
  const categoryFields: Record<string, string> = {};
  for (const fieldDef of fieldDefs) {
    const val = formData.get(fieldDef.name);
    if (typeof val === 'string' && val.trim().length > 0) {
      categoryFields[fieldDef.name] = val;
    }
  }

  const validation = validateIdea({ ...input, categoryFields });
  if (!validation.valid) {
    return { errors: validation.errors };
  }

  // Collect all attached files (multi-file, Phase 3)
  const rawFiles = formData.getAll('file');
  const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

  // Prepare buffers and detect MIME types before the synchronous transaction
  interface PreparedFile {
    file: File;
    buffer: Buffer;
    detectedMime: string;
  }
  const preparedFiles: PreparedFile[] = [];
  const fileInputs: AttachmentFileInput[] = [];

  for (const file of files) {
    const ext = '.' + (file.name.split('.').pop() ?? '');
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectMimeType(buffer, ext);
    if (!detectedMime) {
      return { errors: { files: `File "${file.name}" has an unrecognized type. Please upload PDF, DOC, DOCX, PPTX, PNG, JPEG, MP4, or MOV files.` } };
    }
    preparedFiles.push({ file, buffer, detectedMime });
    fileInputs.push({ name: file.name, mimeType: detectedMime, sizeBytes: file.size });
  }

  const attachValidation = validateAttachments(fileInputs);
  if (!attachValidation.valid) {
    const errors: Record<string, string> = {
      ...attachValidation.formErrors,
      ...attachValidation.fileErrors,
    };
    return { errors };
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const savedPaths: string[] = [];

  try {
    dbInstance.transaction((tx) => {
      // Insert the idea row
      tx.insert(ideas).values({
        id,
        numericId: Math.floor(Math.random() * 2_000_000_000),
        submitterId: session.user!.id!,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        status: 'submitted',
        submittedAt: now,
      }).run();

      // Persist category-specific fields when present
      if (Object.keys(categoryFields).length > 0) {
        const storedFields: Record<string, string | null> = {};
        for (const fieldDef of fieldDefs) {
          storedFields[fieldDef.name] = categoryFields[fieldDef.name] ?? null;
        }
        tx.insert(ideaCategoryData).values({
          ideaId: id,
          category: input.category,
          fields: storedFields,
          createdAt: now,
        }).run();
      }

      // Save each file to disk and insert its attachment row
      for (let i = 0; i < preparedFiles.length; i++) {
        const { file, buffer, detectedMime } = preparedFiles[i];
        const storagePath = saveFile(buffer, detectedMime, UPLOAD_DIR);
        savedPaths.push(storagePath);
        tx.insert(attachments).values({
          id: crypto.randomUUID(),
          ideaId: id,
          fileName: file.name,
          fileType: detectedMime,
          fileSize: file.size,
          storagePath,
          uploadOrderIndex: i,
          uploadedAt: now,
        }).run();
      }
    });
  } catch (err) {
    // Rollback disk writes for files that were already saved before the error
    for (const storagePath of savedPaths) {
      try { deleteFile(storagePath, UPLOAD_DIR); } catch { /* ignore cleanup errors */ }
    }
    throw err;
  }

  redirect(`/ideas/${id}`);
}


export interface IdeaWithAttachments extends Idea {
  attachments: Attachment[];
  categoryData: IdeaCategoryData | null;
}

/** @deprecated Use IdeaWithAttachments (plural) */
export type IdeaWithAttachment = IdeaWithAttachments;

export async function getMyIdeas(dbInstance: DB = db): Promise<IdeaWithAttachments[]> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const rows = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .leftJoin(ideaCategoryData, eq(ideaCategoryData.ideaId, ideas.id))
    .where(eq(ideas.submitterId, session.user.id))
    .orderBy(desc(ideas.submittedAt), asc(attachments.uploadOrderIndex));

  return groupIdeasWithAttachments(rows);
}

export async function getAdminIdeas(dbInstance: DB = db): Promise<IdeaWithAttachments[]> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/ideas');

  const rows = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .leftJoin(ideaCategoryData, eq(ideaCategoryData.ideaId, ideas.id))
    .orderBy(desc(ideas.submittedAt), asc(attachments.uploadOrderIndex));

  return groupIdeasWithAttachments(rows);
}

export async function getIdeaById(id: string, dbInstance: DB = db): Promise<IdeaWithAttachments | null> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const rows = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .leftJoin(ideaCategoryData, eq(ideaCategoryData.ideaId, ideas.id))
    .where(eq(ideas.id, id))
    .orderBy(asc(attachments.uploadOrderIndex));

  if (rows.length === 0) return null;

  const { ideas: idea, idea_category_data: catData } = rows[0];

  // Ownership check — admins bypass
  if (session.user.role !== 'admin' && idea.submitterId !== session.user.id) {
    return null;
  }

  const ideaAttachments = rows
    .map((r) => r.attachments)
    .filter((a): a is Attachment => a !== null);

  return { ...idea, attachments: ideaAttachments, categoryData: catData ?? null };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type JoinRow = {
  ideas: Idea;
  attachments: Attachment | null;
  idea_category_data: IdeaCategoryData | null;
};

function groupIdeasWithAttachments(rows: JoinRow[]): IdeaWithAttachments[] {
  const ideaMap = new Map<string, IdeaWithAttachments>();

  for (const row of rows) {
    const { ideas: idea, attachments: attachment, idea_category_data: catData } = row;

    if (!ideaMap.has(idea.id)) {
      ideaMap.set(idea.id, {
        ...idea,
        attachments: [],
        categoryData: catData ?? null,
      });
    }

    const entry = ideaMap.get(idea.id)!;
    if (attachment !== null) {
      // Avoid duplicates from multiple LEFT JOIN rows for the same attachment
      if (!entry.attachments.some((a) => a.id === attachment.id)) {
        entry.attachments.push(attachment);
      }
    }
  }

  return Array.from(ideaMap.values());
}
