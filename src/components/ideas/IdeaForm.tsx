'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submitIdea, SubmitIdeaResult } from '@/lib/actions/ideas';
import { CATEGORIES, ALLOWED_MIME_TYPES } from '@/lib/constants';

const initialState: SubmitIdeaResult | null = null;

export function IdeaForm() {
  const [state, formAction, pending] = useActionState(submitIdea, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          maxLength={100}
          required
          aria-describedby={state?.errors?.title ? 'title-error' : undefined}
        />
        {state?.errors?.title && (
          <p id="title-error" className="text-sm text-red-600">
            {state.errors.title}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          maxLength={2000}
          required
          aria-describedby={state?.errors?.description ? 'description-error' : undefined}
        />
        {state?.errors?.description && (
          <p id="description-error" className="text-sm text-red-600">
            {state.errors.description}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="category">Category</Label>
        <Select name="category" required>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>
                {cat.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.errors?.category && (
          <p className="text-sm text-red-600">{state.errors.category}</p>
        )}
      </div>

      {state?.errors && Object.keys(state.errors).length > 0 && (
        <Alert variant="destructive">
          Please fix the errors above and try again.
        </Alert>
      )}

      <div className="space-y-1">
        <Label htmlFor="file">
          Attachment <span className="text-neutral-400 font-normal">(optional)</span>
        </Label>
        <input
          id="file"
          name="file"
          type="file"
          accept={[...ALLOWED_MIME_TYPES].join(',')}
          className="text-sm"
        />
        <p className="text-xs text-neutral-500">PDF, DOC, DOCX, PNG or JPEG — max 10 MB</p>
        {state?.errors?.file && (
          <p className="text-sm text-red-600">{state.errors.file}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit Idea'}
      </Button>
    </form>
  );
}
