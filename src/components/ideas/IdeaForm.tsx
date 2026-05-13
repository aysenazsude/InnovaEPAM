'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submitIdea, SubmitIdeaResult } from '@/lib/actions/ideas';
import { CATEGORIES, ALLOWED_MIME_TYPES, CategorySlug } from '@/lib/constants';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';
import { CategoryFields } from '@/components/ideas/CategoryFields';

const initialState: SubmitIdeaResult | null = null;

export function IdeaForm() {
  const [state, formAction, pending] = useActionState(submitIdea, initialState);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          maxLength={100}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
        <Select
          name="category"
          required
          onValueChange={(value) => setSelectedCategory(value as CategorySlug)}
        >
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

      {/* Dynamic category-specific fields (JS-enhanced) */}
      <CategoryFields category={selectedCategory} errors={state?.errors ?? undefined} />

      {/* Noscript fallback: renders all category fieldsets when JS is unavailable */}
      <noscript>
        {CATEGORIES.filter((cat) => CATEGORY_FIELDS[cat.slug].length > 0).map((cat) => (
          <fieldset key={cat.slug} className="border border-neutral-200 rounded-md p-4 space-y-4">
            <legend className="text-sm font-medium px-1">{cat.displayName} Fields</legend>
            {CATEGORY_FIELDS[cat.slug].map((field) => {
              const fieldId = `noscript-field-${field.name}`;
              return (
                <div key={field.name} className="space-y-1">
                  <Label htmlFor={fieldId}>{field.label}</Label>
                  {field.type === 'select' && field.options ? (
                    <select id={fieldId} name={field.name} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="">— Select —</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={fieldId}
                      name={field.name}
                      maxLength={field.maxLength}
                      placeholder={field.placeholder}
                      rows={4}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  ) : (
                    <input
                      id={fieldId}
                      name={field.name}
                      type="text"
                      maxLength={field.maxLength}
                      placeholder={field.placeholder}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </fieldset>
        ))}
      </noscript>

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

