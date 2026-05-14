import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAdminIdeas } from '@/lib/actions/ideas';
import { getPipelineCounts, getStaleClarificationIdeaIds } from '@/lib/actions/pipeline';
import { AdminIdeaList } from '@/components/admin/AdminIdeaList';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect('/ideas');
  }

  const [ideas, pipelineCounts, staleIds] = await Promise.all([
    getAdminIdeas(),
    getPipelineCounts(),
    getStaleClarificationIdeaIds(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <AdminIdeaList ideas={ideas} pipelineCounts={pipelineCounts} staleClarificationIdeaIds={new Set(staleIds)} />
    </div>
  );
}
