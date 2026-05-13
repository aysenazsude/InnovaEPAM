'use server';

import { auth } from '@/auth';
import { db, type DB } from '@/lib/db';
import { ideas, attachments, ideaCategoryData, Idea, Attachment, IdeaCategoryData } from '@/lib/db/schema';
import { validateIdea } from '@/lib/ideas/ideaValidator';
import { validateAttachment } from '@/lib/attachments/attachmentValidator';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';
import { saveFile } from '@/lib/storage';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
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

  // Optional file attachment
  const file = formData.get('file');
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile) {
    const attachValidation = validateAttachment(file.type, file.size, 0);
    if (!attachValidation.valid) {
      return { errors: { file: attachValidation.error ?? 'Invalid file' } };
    }
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await dbInstance.insert(ideas).values({
    id,
    numericId: Math.floor(Math.random() * 2_000_000_000),
    submitterId: session.user.id,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'submitted',
    submittedAt: now,
  });

  // Persist category-specific fields when present
  if (Object.keys(categoryFields).length > 0) {
    const storedFields: Record<string, string | null> = {};
    for (const fieldDef of fieldDefs) {
      storedFields[fieldDef.name] = categoryFields[fieldDef.name] ?? null;
    }
    await dbInstance.insert(ideaCategoryData).values({
      ideaId: id,
      category: input.category,
      fields: storedFields,
      createdAt: now,
    });
  }

  // Save attachment if provided
  if (hasFile) {
    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const storagePath = saveFile(buffer, (file as File).type, UPLOAD_DIR);
    await dbInstance.insert(attachments).values({
      id: crypto.randomUUID(),
      ideaId: id,
      fileName: (file as File).name,
      fileType: (file as File).type,
      fileSize: (file as File).size,
      storagePath,
      uploadedAt: now,
    });
  }

  redirect(`/ideas/${id}`);
}


export interface IdeaWithAttachment extends Idea {
  attachment: Attachment | null;
  categoryData: IdeaCategoryData | null;
}

export async function getMyIdeas(dbInstance: DB = db): Promise<IdeaWithAttachment[]> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const rows = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .leftJoin(ideaCategoryData, eq(ideaCategoryData.ideaId, ideas.id))
    .where(eq(ideas.submitterId, session.user.id))
    .orderBy(desc(ideas.submittedAt));

  return rows.map(({ ideas: idea, attachments: attachment, idea_category_data: catData }) => ({
    ...idea,
    attachment: attachment ?? null,
    categoryData: catData ?? null,
  }));
}

export async function getAdminIdeas(dbInstance: DB = db): Promise<IdeaWithAttachment[]> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/ideas');

  const rows = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .leftJoin(ideaCategoryData, eq(ideaCategoryData.ideaId, ideas.id))
    .orderBy(desc(ideas.submittedAt));

  return rows.map(({ ideas: idea, attachments: attachment, idea_category_data: catData }) => ({
    ...idea,
    attachment: attachment ?? null,
    categoryData: catData ?? null,
  }));
}

export async function getIdeaById(id: string, dbInstance: DB = db): Promise<IdeaWithAttachment | null> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [row] = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .leftJoin(ideaCategoryData, eq(ideaCategoryData.ideaId, ideas.id))
    .where(eq(ideas.id, id))
    .limit(1);

  if (!row) return null;

  const { ideas: idea, attachments: attachment, idea_category_data: catData } = row;

  // Ownership check — admins bypass
  if (session.user.role !== 'admin' && idea.submitterId !== session.user.id) {
    return null;
  }

  return { ...idea, attachment: attachment ?? null, categoryData: catData ?? null };
}
