import { IdeaWithAttachments } from '@/lib/actions/ideas';
import { IdeaCard } from './IdeaCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface IdeaListProps {
  ideas: IdeaWithAttachments[];
}

export function IdeaList({ ideas }: IdeaListProps) {
  if (ideas.length === 0) {
    return (
      <section className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">You haven&apos;t submitted any ideas yet.</p>
        <Button asChild>
          <Link href="/ideas/new">Submit Your First Idea</Link>
        </Button>
      </section>
    );
  }

  return (
    <ul className="space-y-4">
      {ideas.map((idea) => (
        <li key={idea.id}>
          <IdeaCard idea={idea} />
        </li>
      ))}
    </ul>
  );
}
