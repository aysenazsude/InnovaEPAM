'use client';

import React, { useState } from 'react';
import { CategorySlug } from '@/lib/constants';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';
import { CATEGORY_GUIDANCE } from '@/lib/ideas/categoryGuidanceConfig';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryFieldsProps {
  category: CategorySlug | undefined;
  errors?: Record<string, string>;
}

function TextareaWithCounter({
  id,
  name,
  maxLength,
  placeholder,
}: {
  id: string;
  name: string;
  maxLength: number;
  placeholder?: string;
}) {
  const [count, setCount] = useState(0);

  return (
    <div className="space-y-1">
      <Textarea
        id={id}
        name={name}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={4}
        onChange={(e) => setCount(e.target.value.length)}
      />
      <p className="text-xs text-neutral-500 text-right" aria-live="off">
        {count} / {maxLength}
      </p>
    </div>
  );
}

export function CategoryFields({ category, errors }: CategoryFieldsProps) {
  if (!category) return null;

  const fields = CATEGORY_FIELDS[category];
  const guidance = CATEGORY_GUIDANCE[category];

  if (fields.length === 0) return null;

  return (
    <div aria-live="polite" role="status" className="space-y-4">
      {guidance && (
        <p
          data-testid="category-guidance"
          aria-live="polite"
          role="status"
          className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md p-3"
        >
          {guidance}
        </p>
      )}

      {fields.map((field) => {
        const fieldId = `category-field-${field.name}`;
        const error = errors?.[field.name];

        return (
          <div key={field.name} className="space-y-1">
            <Label htmlFor={fieldId}>{field.label}</Label>

            {field.type === 'select' && field.options ? (
              <Select name={field.name}>
                <SelectTrigger id={fieldId}>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === 'textarea' ? (
              <TextareaWithCounter
                id={fieldId}
                name={field.name}
                maxLength={field.maxLength ?? 500}
                placeholder={field.placeholder}
              />
            ) : (
              <Input
                id={fieldId}
                name={field.name}
                type="text"
                maxLength={field.maxLength}
                placeholder={field.placeholder}
              />
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
