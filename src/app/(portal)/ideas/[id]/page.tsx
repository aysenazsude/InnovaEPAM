import { notFound } from 'next/navigation';
import { getIdeaById } from '@/lib/actions/ideas';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/ideas/FileUpload';

const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

type Params = { params: Promise<{ id: string }> };

export default async function IdeaDetailPage({ params }: Params) {
  const { id } = await params;
  const idea = await getIdeaById(id);

  if (!idea) notFound();

  const submittedDate = format(new Date(idea.submittedAt * 1000), 'dd MMM yyyy');

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

          {idea.attachment ? (
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
          ) : idea.status === 'submitted' ? (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Attachment <span className="text-neutral-400 font-normal">(optional)</span></p>
                <FileUpload ideaId={idea.id} />
              </div>
            </>
          ) : null}

          {(idea.status === 'accepted' || idea.status === 'rejected') && idea.adminComment && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Admin Feedback</p>
                <p className="text-sm">{idea.adminComment}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
