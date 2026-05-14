'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_ATTACHMENTS_PER_IDEA, ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT } from '@/lib/constants';
import { getPreviewKind, PreviewKind } from '@/lib/attachments/mimeToIcon';

interface StagedFile {
  file: File;
  previewUrl: string;
  kind: PreviewKind;
  error: string | null;
}

export function FileUpload() {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const pickerRef = useRef<HTMLInputElement>(null);
  const submissionInputRef = useRef<HTMLInputElement>(null);
  const stagedRef = useRef<StagedFile[]>([]);

  // Keep ref in sync for unmount cleanup
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      stagedRef.current.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    };
  }, []);

  // Sync staged files to the form submission input via DataTransfer (browser only)
  useEffect(() => {
    if (!submissionInputRef.current || typeof DataTransfer === 'undefined') return;
    const dt = new DataTransfer();
    staged.forEach(({ file, error }) => {
      if (!error) dt.items.add(file);
    });
    submissionInputRef.current.files = dt.files;
  }, [staged]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    // Reset picker so same file can be picked again after removal
    e.target.value = '';
    if (incoming.length === 0) return;

    const newEntries: StagedFile[] = incoming.map((file) => {
      // Duplicate name check (against already-staged valid files)
      const isDuplicate = staged.some((s) => s.file.name === file.name && !s.error);
      if (isDuplicate) {
        return { file, previewUrl: '', kind: getPreviewKind(file.type), error: `"${file.name}" is already added` };
      }

      const allowed: readonly string[] = ALLOWED_MIME_TYPES;
      if (!allowed.includes(file.type)) {
        return { file, previewUrl: '', kind: 'document', error: `File type not allowed: ${file.name}` };
      }

      if (file.size > FILE_SIZE_LIMIT) {
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          kind: getPreviewKind(file.type),
          error: `File too large (max 10 MB): ${file.name}`,
        };
      }

      return {
        file,
        previewUrl: URL.createObjectURL(file),
        kind: getPreviewKind(file.type),
        error: null,
      };
    });

    setStaged((prev) => [...prev, ...newEntries]);
  }

  function removeFile(index: number) {
    setStaged((prev) => {
      const sf = prev[index];
      if (sf?.previewUrl) URL.revokeObjectURL(sf.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  const validCount = staged.filter((s) => !s.error).length;
  const atLimit = validCount >= MAX_ATTACHMENTS_PER_IDEA;

  return (
    <div className="space-y-3">
      {/* Hidden form submission input — populated via DataTransfer */}
      <input
        ref={submissionInputRef}
        type="file"
        name="file"
        multiple
        aria-hidden="true"
        tabIndex={-1}
        readOnly
        className="hidden"
      />

      {/* Staged file list */}
      <ul aria-live="polite" aria-label="Staged attachments" className="space-y-2">
        {staged.map((sf, i) => (
          <li key={`${sf.file.name}-${i}`} className="flex items-start gap-2">
            {sf.kind === 'image' && sf.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sf.previewUrl}
                alt={sf.file.name}
                className="h-16 w-16 shrink-0 rounded object-cover"
              />
            ) : sf.kind === 'video' && sf.previewUrl ? (
              <video
                src={sf.previewUrl}
                controls
                preload="none"
                aria-label={sf.file.name}
                className="h-16 w-28 shrink-0 rounded"
              />
            ) : (
              <span
                role="img"
                aria-label={`Document: ${sf.file.name}`}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-neutral-100 text-2xl"
              >
                📄
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{sf.file.name}</p>
              {sf.error && (
                <p role="alert" className="text-sm text-red-600">
                  {sf.error}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeFile(i)}
              aria-label={`Remove ${sf.file.name}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      {/* Add file control or limit message */}
      {atLimit ? (
        <p className="text-sm text-neutral-500">
          Maximum {MAX_ATTACHMENTS_PER_IDEA} files reached
        </p>
      ) : (
        <>
          <input
            ref={pickerRef}
            type="file"
            accept={[...ALLOWED_MIME_TYPES].join(',')}
            onChange={handlePick}
            aria-label="Pick files to attach"
            data-testid="file-picker"
            className="hidden"
            tabIndex={-1}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => pickerRef.current?.click()}
          >
            Add File
          </Button>
        </>
      )}

      {/* No-JS fallback */}
      <noscript>
        <input
          type="file"
          name="file"
          multiple
          accept={[...ALLOWED_MIME_TYPES].join(',')}
        />
      </noscript>
    </div>
  );
}

