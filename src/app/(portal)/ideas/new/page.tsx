import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IdeaForm } from '@/components/ideas/IdeaForm';
import { getDraft } from '@/lib/actions/drafts';
import type { CategorySlug } from '@/lib/constants';

interface NewIdeaPageProps {
  searchParams: Promise<{ draftId?: string }>;
}

export default async function NewIdeaPage({ searchParams }: NewIdeaPageProps) {
  const { draftId } = await searchParams;
  let draftProps: {
    draftId?: string;
    draftVersion?: number;
    defaultValues?: { title?: string; description?: string; category?: CategorySlug };
  } = {};

  if (draftId) {
    const draft = await getDraft(draftId);
    if (!draft) {
      notFound();
    }
    draftProps = {
      draftId: draft.id,
      draftVersion: draft.version,
      defaultValues: {
        title: draft.title ?? undefined,
        description: draft.description ?? undefined,
        category: draft.category as CategorySlug | undefined,
      },
    };
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>{draftId ? 'Resume Draft' : 'Submit a New Idea'}</CardTitle>
        </CardHeader>
        <CardContent>
          <IdeaForm {...draftProps} />
        </CardContent>
      </Card>
    </div>
  );
}
