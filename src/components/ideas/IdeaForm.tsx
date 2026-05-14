'use client';

import { useActionState, useState, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submitIdea, SubmitIdeaResult } from '@/lib/actions/ideas';
import { saveDraft, type SaveDraftResult } from '@/lib/actions/drafts';
import { CATEGORIES, CategorySlug } from '@/lib/constants';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';
import { CategoryFields } from '@/components/ideas/CategoryFields';
import { FileUpload } from '@/components/ideas/FileUpload';

const initialState: SubmitIdeaResult | null = null;
const initialDraftState: SaveDraftResult | null = null;

export interface DraftFormValues {
  title?: string;
  description?: string;
  category?: CategorySlug;
}

interface IdeaFormProps {
  /** When resuming a draft, pass the draft ID to pre-fill and update it on save. */
  draftId?: string;
  /** Optimistic concurrency version of the draft being edited. */
  draftVersion?: number;
  /** Pre-filled values from an existing draft. */
  defaultValues?: DraftFormValues;
}

export function IdeaForm({ draftId, draftVersion, defaultValues }: IdeaFormProps = {}) {
  const [state, formAction, pending] = useActionState(submitIdea, initialState);
  const [draftState, setDraftState] = useState<SaveDraftResult | null>(initialDraftState);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | undefined>(
    defaultValues?.category
  );
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(draftId);
  const [currentVersion, setCurrentVersion] = useState<number | undefined>(draftVersion);
  const [draftSaving, startDraftTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSaveDraft() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    if (currentDraftId) formData.set('draftId', currentDraftId);
    if (currentVersion != null) formData.set('version', String(currentVersion));

    startDraftTransition(async () => {
      const result = await saveDraft(null, formData);
      setDraftState(result);
      if (result.success && result.draftId) {
        setCurrentDraftId(result.draftId);
        setCurrentVersion(result.version);
      }
    });
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {/* Hidden draft coordination fields (populated by handleSaveDraft) */}
      {currentDraftId && <input type="hidden" name="draftId" value={currentDraftId} />}
      {currentVersion != null && <input type="hidden" name="version" value={currentVersion} />}

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
        <Label>
          Attachments <span className="text-neutral-400 font-normal">(optional, up to 3 files)</span>
        </Label>
        <FileUpload />
        <p className="text-xs text-neutral-500">PDF, DOC, DOCX, PPTX, PNG, JPEG, MP4, MOV — max 10 MB each / 30 MB total</p>
        {state?.errors?.file && (
          <p className="text-sm text-red-600">{state.errors.file}</p>
        )}
        {state?.errors?.files && (
          <p className="text-sm text-red-600">{state.errors.files}</p>
        )}
        {state?.errors?.totalSize && (
          <p className="text-sm text-red-600">{state.errors.totalSize}</p>
        )}
      </div>

      {pending && (
        <div
          role="progressbar"
          aria-busy="true"
          aria-label="Uploading files…"
          className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
        >
          <div className="h-full w-full animate-pulse bg-brand-500" />
        </div>
      )}

      {/* Draft save feedback */}
      {draftState && (
        <div aria-live="polite" className="text-sm">
          {draftState.success && (
            <p className="text-green-600">Draft saved successfully.</p>
          )}
          {draftState.limitReached && (
            <p className="text-amber-600">
              You have reached the maximum number of drafts (10). Please delete a draft before saving.
            </p>
          )}
          {draftState.conflict && (
            <p className="text-red-600">
              This draft was updated in another tab. Please reload to get the latest version.
            </p>
          )}
          {draftState.errors && (
            <p className="text-red-600">Failed to save draft. Please try again.</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit Idea'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={draftSaving}
          onClick={handleSaveDraft}
        >
          {draftSaving ? 'Saving…' : 'Save Draft'}
        </Button>
      </div>
    </form>
  );
}

