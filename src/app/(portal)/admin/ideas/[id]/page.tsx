import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getIdeaById } from '@/lib/actions/ideas';
import { transitionToUnderReview } from '@/lib/actions/evaluation';
import { EvaluationForm } from '@/components/admin/EvaluationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { CATEGORY_FIELDS } from '@/lib/ideas/categoryFieldConfig';
import { CategorySlug } from '@/lib/constants';

type Params = { params: Promise<{ id: string }> };

const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export default async function AdminIdeaDetailPage({ params }: Params) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect('/ideas');
  }

  // Auto-transition to under_review on load (no-op if already past submitted)
  await transitionToUnderReview(id);

  const idea = await getIdeaById(id);
  if (!idea) notFound();

  const submittedDate = format(new Date(idea.submittedAt * 1000), 'dd MMM yyyy');
  const canEvaluate = idea.status === 'submitted' || idea.status === 'under_review';

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{idea.title}</CardTitle>
            <span className="text-sm font-medium">{statusLabel[idea.status] ?? idea.status}</span>
          </div>
          <p className="text-sm text-neutral-500">
            {idea.category.replace(/_/g, ' ')} &middot; {submittedDate}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm">{idea.description}</p>

          {idea.attachment && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Attachment</p>
                <a
                  href={`/api/attachments/${idea.attachment.id}`}
                  className="text-sm text-brand-500 underline"
                  download={idea.attachment.fileName}
                >
                  {idea.attachment.fileName}
                </a>
              </div>
            </>
          )}

          {canEvaluate && (
            <>
              <Separator />
              <EvaluationForm ideaId={idea.id} />
            </>
          )}

          {(idea.status === 'accepted' || idea.status === 'rejected') && idea.adminComment && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Decision</p>
                <p className="text-sm">{idea.adminComment}</p>
              </div>
            </>
          )}

          {idea.categoryData && (() => {
            const fieldDefs = CATEGORY_FIELDS[idea.categoryData.category as CategorySlug] ?? [];
            const presentFields = fieldDefs.filter(
              (f) => idea.categoryData!.fields[f.name] != null && idea.categoryData!.fields[f.name] !== ''
            );
            if (presentFields.length === 0) return null;
            return (
              <>
                <Separator />
                <section aria-labelledby="category-details-heading">
                  <p id="category-details-heading" className="text-sm font-medium mb-2">
                    Category Details
                  </p>
                  <dl className="space-y-1">
                    {presentFields.map((f) => (
                      <div key={f.name} className="flex gap-2 text-sm">
                        <dt className="font-medium text-neutral-600 min-w-[160px]">{f.label}</dt>
                        <dd className="text-neutral-900">{idea.categoryData!.fields[f.name]}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
