import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { attachments, ideas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFile } from '@/lib/storage';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1);
  if (!attachment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [idea] = await db.select().from(ideas).where(eq(ideas.id, attachment.ideaId)).limit(1);
  if (!idea) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (session.user.role !== 'admin' && idea.submitterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const fullPath = path.join(UPLOAD_DIR, attachment.storagePath);
  const fileBuffer = fs.readFileSync(fullPath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': attachment.fileType,
      'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1);
  if (!attachment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [idea] = await db.select().from(ideas).where(eq(ideas.id, attachment.ideaId)).limit(1);
  if (!idea) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (idea.submitterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (['under_review', 'accepted', 'rejected'].includes(idea.status)) {
    return NextResponse.json({ error: 'Cannot delete attachment on non-submitted idea' }, { status: 403 });
  }

  deleteFile(attachment.storagePath, UPLOAD_DIR);

  await db.delete(attachments).where(eq(attachments.id, id));

  return new NextResponse(null, { status: 204 });
}
