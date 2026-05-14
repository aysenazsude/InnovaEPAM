import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getIdeaById } from '@/lib/actions/ideas';
import { getPipelineHistory } from '@/lib/actions/pipeline';
import { getPendingClarification } from '@/lib/pipeline/pipelineRepository';
import { db } from '@/lib/db';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PipelineProgress } from '@/components/ideas/PipelineProgress';
import { ClarificationResponseForm } from '@/components/ideas/ClarificationResponseForm';
import { isPipelineStatus } from '@/lib/ideas/pipelineMachine';
import type { StageTransitionView } from '@/lib/pipeline/pipelineRepository';

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

  const session = await auth();
  const isSubmitter = session?.user?.id === idea.submitterId;

  // Fetch pipeline history for pipeline-status ideas
  let pipelineHistory: StageTransitionView[] = [];
  let pendingClarification: Awaited<ReturnType<typeof getPendingClarification>> = null;

  if (isPipelineStatus(idea.status)) {
    const historyResult = await getPipelineHistory(idea.id);
    if (Array.isArray(historyResult)) pipelineHistory = historyResult;

    if (idea.status === 'awaiting_clarification' && isSubmitter && idea.activeClarificationId) {
      pendingClarification = await getPendingClarification(idea.id, db);
    }
  }

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

          {isPipelineStatus(idea.status) && (
            <>
              <Separator />
              <PipelineProgress currentStatus={idea.status} history={pipelineHistory} />

              {pendingClarification && idea.status === 'awaiting_clarification' && (
                <>
                  <Separator />
                  <ClarificationResponseForm
                    ideaId={idea.id}
                    clarificationId={pendingClarification.id}
                    question={pendingClarification.question}
                  />
                </>
              )}
            </>
          )}

          {idea.attachments.length > 0 ? (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">
                  {idea.attachments.length === 1 ? 'Attachment' : 'Attachments'}
                </p>
                <ul className="space-y-1">
                  {idea.attachments.map((att) => (
                    <li key={att.id}>
                      <a
                        href={`/api/attachments/${att.id}`}
                        className="text-sm text-brand-500 underline"
                        download={att.fileName}
                      >
                        {att.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <p className="text-sm text-neutral-400">No attachments</p>
            </>
          )}

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
