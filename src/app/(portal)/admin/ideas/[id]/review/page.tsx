import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getIdeaById } from '@/lib/actions/ideas';
import { getPipelineHistory, startPipelineReview } from '@/lib/actions/pipeline';
import { PipelineForm } from '@/components/admin/PipelineForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { isPipelineStatus, isActivePipelineStage, PIPELINE_STAGES } from '@/lib/ideas/pipelineMachine';
import type { PipelineStage } from '@/lib/ideas/pipelineMachine';
import type { StageTransitionView } from '@/lib/pipeline/pipelineRepository';
import { ANONYMOUS_SUBMITTER_LABEL } from '@/lib/constants';
import Link from 'next/link';

type Params = { params: Promise<{ id: string }> };

const STAGE_LABELS: Record<PipelineStage, string> = {
  screening: 'Screening',
  technical_review: 'Technical Review',
  business_review: 'Business Review',
  final_decision: 'Final Decision',
};

export default async function PipelineReviewPage({ params }: Params) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect('/login');
  }

  const idea = await getIdeaById(id);
  if (!idea) notFound();

  // Auto-start pipeline review if still submitted or under_review
  if (idea.status === 'submitted' || idea.status === 'under_review') {
    await startPipelineReview(id);
    // Re-fetch updated idea
    const refreshed = await getIdeaById(id);
    if (!refreshed) notFound();
    return <PipelineReviewContent idea={refreshed} />;
  }

  if (!isPipelineStatus(idea.status)) {
    // Terminal state (accepted/rejected) — redirect back
    redirect(`/admin/ideas/${id}`);
  }

  return <PipelineReviewContent idea={idea} />;
}

async function PipelineReviewContent({ idea }: { idea: NonNullable<Awaited<ReturnType<typeof getIdeaById>>> }) {
  const historyResult = await getPipelineHistory(idea.id);
  const history: StageTransitionView[] = Array.isArray(historyResult) ? historyResult : [];

  const isActive = isActivePipelineStage(idea.status);
  const currentStage = isActive ? (idea.status as PipelineStage) : null;

  const submittedDate = format(new Date(idea.submittedAt * 1000), 'MMM d, yyyy');

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/admin/ideas" className="hover:underline">
          ← All Ideas
        </Link>
        <span>/</span>
        <span>Pipeline Review</span>
      </div>

      {/* Idea summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{idea.title}</CardTitle>
          <p className="text-sm text-neutral-500">
            Submitted by <strong>{ANONYMOUS_SUBMITTER_LABEL}</strong> on {submittedDate}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-700">{idea.description}</p>
          <Separator className="my-4" />
          <p className="text-sm">
            <span className="font-medium">Current Status: </span>
            <span className="capitalize">{idea.status.replace(/_/g, ' ')}</span>
          </p>
        </CardContent>
      </Card>

      {/* Pipeline progress stepper */}
      <nav aria-label="pipeline stages" className="flex items-center gap-0">
        {PIPELINE_STAGES.map((stage, i) => {
          const stageHistory = history.filter((h) => h.stage === stage);
          const isCompleted =
            stageHistory.some((h) => h.action === 'advanced' || h.action === 'approved') ||
            (idea.status === 'rejected' && stageHistory.length > 0 && i < PIPELINE_STAGES.indexOf(idea.status as PipelineStage));
          const isCurrent = idea.status === stage;
          return (
            <div key={stage} className="flex flex-1 items-center">
              <div className={`flex flex-col items-center text-xs ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600 font-semibold' : 'text-neutral-400'}`}>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold
                  ${isCompleted ? 'border-green-600 bg-green-50' : isCurrent ? 'border-blue-600 bg-blue-50' : 'border-neutral-300'}`}>
                  {i + 1}
                </div>
                <span className="mt-1 text-center">{STAGE_LABELS[stage]}</span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-green-400' : 'bg-neutral-200'}`} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Terminal states */}
      {idea.status === 'approved' && (
        <div className="rounded border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          ✓ This idea has been <strong>approved</strong>.
        </div>
      )}
      {idea.status === 'rejected' && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          ✗ This idea was <strong>rejected</strong>.
        </div>
      )}

      {/* Active pipeline form */}
      {currentStage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {STAGE_LABELS[currentStage]} — Stage Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineForm
              ideaId={idea.id}
              currentStage={currentStage}
              history={history}
              activeClarificationId={idea.activeClarificationId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
