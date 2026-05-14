import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { draftAttachments, drafts } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
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
    .from(draftAttachments)
    .where(eq(draftAttachments.id, id))
    .limit(1);
  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  // Verify ownership — draft must belong to the requesting user
  const [draft] = await db
    .select()
    .from(drafts)
    .where(
      and(eq(drafts.id, attachment.draftId), eq(drafts.submitterId, session.user.id!))
    )
    .limit(1);

  if (!draft) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const fullPath = path.join(UPLOAD_DIR, attachment.storagePath);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 410 });
  }

  const fileSize = fs.statSync(fullPath).size;
  const rangeHeader = _req.headers.get('range');
  const contentDisposition = `attachment; filename="${attachment.fileName}"`;

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const chunk = Buffer.alloc(chunkSize);
    const fd = fs.openSync(fullPath, 'r');
    fs.readSync(fd, chunk, 0, chunkSize, start);
    fs.closeSync(fd);

    return new NextResponse(chunk, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': attachment.fileType,
        'Content-Disposition': contentDisposition,
      },
    });
  }

  const fileBuffer = fs.readFileSync(fullPath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Type': attachment.fileType,
      'Content-Disposition': contentDisposition,
      'Content-Length': String(fileSize),
    },
  });
}
