import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { attachments, ideas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateAttachment } from '@/lib/attachments/attachmentValidator';
import { saveFile } from '@/lib/storage';
import { ALLOWED_MIME_TYPES } from '@/lib/constants';
import path from 'node:path';

export const runtime = 'nodejs';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const ideaId = formData.get('ideaId');

  if (!file || typeof file === 'string' || !ideaId || typeof ideaId !== 'string') {
    return NextResponse.json({ error: 'file and ideaId are required' }, { status: 400 });
  }

  // Find and authorize idea
  const [idea] = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }
  if (idea.submitterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (['under_review', 'accepted', 'rejected'].includes(idea.status)) {
    return NextResponse.json({ error: 'Cannot modify a non-submitted idea' }, { status: 403 });
  }

  // Check existing attachments
  const existing = await db.select().from(attachments).where(eq(attachments.ideaId, ideaId));

  const validation = validateAttachment(file.type, file.size, existing.length);
  if (!validation.valid) {
    const body: Record<string, unknown> = { error: validation.error };
    if (validation.error?.includes('type')) {
      body.allowedTypes = [...ALLOWED_MIME_TYPES];
    }
    return NextResponse.json(body, { status: validation.statusCode ?? 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = saveFile(buffer, file.type, UPLOAD_DIR);

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(attachments).values({
    id,
    ideaId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    storagePath,
    uploadedAt: now,
  });

  return NextResponse.json(
    { id, fileName: file.name, fileType: file.type, fileSize: file.size, uploadedAt: now },
    { status: 201 }
  );
}
