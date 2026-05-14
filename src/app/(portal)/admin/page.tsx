import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAdminIdeas } from '@/lib/actions/ideas';
import { getPipelineCounts, getStaleClarificationIdeaIds } from '@/lib/actions/pipeline';
import { AdminIdeaList } from '@/components/admin/AdminIdeaList';
import { toAdminIdeaView } from '@/lib/ideas/anonymize';
import { getIdeaAggregateScores } from '@/lib/pipeline/pipelineRepository';
import { getSpotlightData } from '@/lib/actions/spotlight';
import { db } from '@/lib/db';
import { ShieldCheck } from 'lucide-react';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect('/ideas');
  }

  const [allIdeas, pipelineCounts, staleIds, spotlightData] = await Promise.all([
    getAdminIdeas(),
    getPipelineCounts(),
    getStaleClarificationIdeaIds(),
    getSpotlightData(),
  ]);

  const ideaIds = allIdeas.map((i) => i.id);
  const aggregateScores = await getIdeaAggregateScores(ideaIds, db);
  const scoreMap = new Map(aggregateScores.map((s) => [s.ideaId, s.average]));

  const adminViews = allIdeas.map((idea) => toAdminIdeaView(idea, scoreMap.get(idea.id)));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
            <ShieldCheck className="h-5 w-5 text-brand-400" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{allIdeas.length} total idea{allIdeas.length !== 1 ? 's' : ''} in the portal</p>
        </div>
      </div>
      <AdminIdeaList ideas={adminViews} pipelineCounts={pipelineCounts} staleClarificationIdeaIds={new Set(staleIds)} currentPickIdeaId={spotlightData.currentPickIdeaId} />
    </div>
  );
}
