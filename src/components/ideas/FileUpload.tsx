'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FILE_SIZE_LIMIT, ALLOWED_MIME_TYPES } from '@/lib/constants';

interface FileUploadProps {
  ideaId: string;
  onUploadComplete?: () => void;
}

export function FileUpload({ ideaId, onUploadComplete }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > FILE_SIZE_LIMIT) {
      setError('File must be 10 MB or smaller');
      return;
    }
    const allowed: readonly string[] = ALLOWED_MIME_TYPES;
    if (!allowed.includes(file.type)) {
      setError('File type not allowed. Accepted: PDF, DOC, DOCX, PNG, JPEG');
      return;
    }

    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    body.append('ideaId', ideaId);

    const res = await fetch('/api/attachments', { method: 'POST', body });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Upload failed');
      return;
    }

    setFileName(file.name);
    onUploadComplete?.();
    router.refresh();
  }

  function handleRemove() {
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      {fileName ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-700">{fileName}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
            Remove
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={[...ALLOWED_MIME_TYPES].join(',')}
            onChange={handleChange}
            disabled={uploading}
            className="text-sm"
          />
          {uploading && <p className="text-sm text-neutral-500">Uploading…</p>}
        </>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
