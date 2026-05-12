import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IdeaWithAttachment } from '@/lib/actions/ideas';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  submitted: { label: 'Submitted', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

const statusClass: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

interface IdeaCardProps {
  idea: IdeaWithAttachment;
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const submittedDate = format(new Date(idea.submittedAt * 1000), 'dd MMM yyyy');
  const config = statusConfig[idea.status] ?? { label: idea.status, variant: 'outline' as const };
  const colorClass = statusClass[idea.status] ?? '';

  return (
    <Link href={`/ideas/${idea.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{idea.title}</CardTitle>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
              {config.label}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            {idea.category.replace(/_/g, ' ')} &middot; {submittedDate}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
