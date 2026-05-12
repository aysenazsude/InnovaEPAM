'use server';

import { auth } from '@/auth';
import { db, type DB } from '@/lib/db';
import { ideas, attachments, Idea, Attachment } from '@/lib/db/schema';
import { validateIdea } from '@/lib/ideas/ideaValidator';
import { validateAttachment } from '@/lib/attachments/attachmentValidator';
import { saveFile } from '@/lib/storage';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import path from 'node:path';

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

  const validation = validateIdea(input);
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
}

export async function getMyIdeas(dbInstance: DB = db): Promise<IdeaWithAttachment[]> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const rows = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .where(eq(ideas.submitterId, session.user.id))
    .orderBy(desc(ideas.submittedAt));

  return rows.map(({ ideas: idea, attachments: attachment }) => ({
    ...idea,
    attachment: attachment ?? null,
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
    .orderBy(desc(ideas.submittedAt));

  return rows.map(({ ideas: idea, attachments: attachment }) => ({
    ...idea,
    attachment: attachment ?? null,
  }));
}

export async function getIdeaById(id: string, dbInstance: DB = db): Promise<IdeaWithAttachment | null> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [row] = await dbInstance
    .select()
    .from(ideas)
    .leftJoin(attachments, eq(attachments.ideaId, ideas.id))
    .where(eq(ideas.id, id))
    .limit(1);

  if (!row) return null;

  const { ideas: idea, attachments: attachment } = row;

  // Ownership check — admins bypass
  if (session.user.role !== 'admin' && idea.submitterId !== session.user.id) {
    return null;
  }

  return { ...idea, attachment: attachment ?? null };
}
