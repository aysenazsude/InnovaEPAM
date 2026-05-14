import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAdminIdeas } from '@/lib/actions/ideas';
import { getPipelineCounts, getStaleClarificationIdeaIds } from '@/lib/actions/pipeline';
import { AdminIdeaList } from '@/components/admin/AdminIdeaList';
import { toAdminIdeaView } from '@/lib/ideas/anonymize';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect('/ideas');
  }

  const [allIdeas, pipelineCounts, staleIds] = await Promise.all([
    getAdminIdeas(),
    getPipelineCounts(),
    getStaleClarificationIdeaIds(),
  ]);

  const adminViews = allIdeas.map(toAdminIdeaView);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <AdminIdeaList ideas={adminViews} pipelineCounts={pipelineCounts} staleClarificationIdeaIds={new Set(staleIds)} />
    </div>
  );
}
