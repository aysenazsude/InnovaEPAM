import Link from 'next/link';
import { getDrafts } from '@/lib/actions/drafts';
import { DraftList } from '@/components/ideas/DraftList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function DraftsPage() {
  const drafts = await getDrafts();

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Drafts</h1>
        <Button asChild>
          <Link href="/ideas/new">New Idea</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Saved Drafts ({drafts.length} / 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <DraftList drafts={drafts} />
        </CardContent>
      </Card>
    </div>
  );
}
