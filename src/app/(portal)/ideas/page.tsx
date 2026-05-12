import { getMyIdeas } from '@/lib/actions/ideas';
import { IdeaList } from '@/components/ideas/IdeaList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function IdeasPage() {
  const ideas = await getMyIdeas();

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Ideas</h1>
        <Button asChild>
          <Link href="/ideas/new">Submit Idea</Link>
        </Button>
      </div>
      <IdeaList ideas={ideas} />
    </div>
  );
}
