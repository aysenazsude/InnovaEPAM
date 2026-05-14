'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { acceptIdea, rejectIdea } from '@/lib/actions/evaluation';
import { useRouter } from 'next/navigation';
import type { Attachment } from '@/lib/db/schema';
import { getPreviewKind } from '@/lib/attachments/mimeToIcon';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

function typeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'video/mp4': 'MP4',
    'video/quicktime': 'MOV',
  };
  return map[mimeType] ?? mimeType;
}

// ── Attachment list ───────────────────────────────────────────────────────────
function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-neutral-400">No attachments</p>;
  }
  return (
    <ul className="space-y-3">
      {attachments.map((att) => {
        const kind = getPreviewKind(att.fileType);
        const downloadUrl = `/api/attachments/${att.id}`;
        return (
          <li key={att.id} className="flex items-start gap-3 text-sm">
            {/* Preview */}
            {kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={downloadUrl}
                alt={att.fileName}
                className="h-16 w-16 shrink-0 rounded object-cover"
              />
            ) : kind === 'video' ? (
              <video
                src={downloadUrl}
                controls
                preload="none"
                aria-label={att.fileName}
                className="h-16 w-28 shrink-0 rounded"
              />
            ) : (
              <span
                role="img"
                aria-label={`Document: ${att.fileName}`}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-neutral-100 text-2xl"
              >
                📄
              </span>
            )}

            {/* Meta */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">
                  {typeLabel(att.fileType)}
                </span>
                <a
                  href={downloadUrl}
                  className="text-brand-500 underline truncate"
                  download={att.fileName}
                >
                  {att.fileName}
                </a>
              </div>
              <p className="text-xs text-neutral-400">{formatSize(att.fileSize)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── EvaluationForm ────────────────────────────────────────────────────────────
interface EvaluationFormProps {
  ideaId: string;
  attachments: Attachment[];
}

export function EvaluationForm({ ideaId, attachments }: EvaluationFormProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleAction(action: 'accept' | 'reject') {
    if (!comment.trim()) {
      setError('Comment is required');
      return;
    }
    setError(null);
    setPending(true);

    const fn = action === 'accept' ? acceptIdea : rejectIdea;
    const result = await fn(ideaId, comment);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Attachment preview section */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {attachments.length > 0
            ? `Attachments (${attachments.length})`
            : 'Attachments'}
        </p>
        <AttachmentList attachments={attachments} />
      </div>

      <Separator />

      {/* Evaluation controls */}
      <div className="space-y-1">
        <Label htmlFor="admin-comment">Comment</Label>
        <Textarea
          id="admin-comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Provide feedback for the submitter…"
          disabled={pending}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          variant="default"
          onClick={() => handleAction('accept')}
          disabled={pending}
          className="bg-green-600 hover:bg-green-700"
        >
          {pending ? '…' : 'Accept'}
        </Button>
        <Button
          variant="destructive"
          onClick={() => handleAction('reject')}
          disabled={pending}
        >
          {pending ? '…' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}

