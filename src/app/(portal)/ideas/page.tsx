import { getMyIdeas } from '@/lib/actions/ideas';
import { IdeaList } from '@/components/ideas/IdeaList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default async function IdeasPage() {
  const ideas = await getMyIdeas();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Ideas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{ideas.length} idea{ideas.length !== 1 ? 's' : ''} submitted</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/ideas/new">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Submit Idea
          </Link>
        </Button>
      </div>
      <IdeaList ideas={ideas} />
    </div>
  );
}
