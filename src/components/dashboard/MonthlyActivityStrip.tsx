import { FileText, Clock, CheckCircle2 } from 'lucide-react';
import type { MonthlyActivity } from '@/lib/actions/spotlight';

interface MonthlyActivityStripProps {
  activity: MonthlyActivity;
}

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}

export function MonthlyActivityStrip({ activity }: MonthlyActivityStripProps) {
  const stats: StatItem[] = [
    {
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
      label: 'Submitted',
      value: activity.submitted,
      colorClass: 'text-brand-400',
    },
    {
      icon: <Clock className="h-4 w-4" aria-hidden="true" />,
      label: 'In Review',
      value: activity.inReview,
      colorClass: 'text-orange-400',
    },
    {
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
      label: 'Approved',
      value: activity.approved,
      colorClass: 'text-green-400',
    },
  ];

  return (
    <section aria-label={`Monthly activity for ${activity.monthLabel}`}>
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {activity.monthLabel}
        </p>
        <div className="flex flex-wrap gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className={`${stat.colorClass} flex-shrink-0`}>{stat.icon}</span>
              <div>
                <p className={`text-xl font-bold ${stat.colorClass}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
