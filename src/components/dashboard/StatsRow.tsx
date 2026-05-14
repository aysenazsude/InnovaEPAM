import { Lightbulb, CheckCircle, Clock } from 'lucide-react';
import type { SystemStats } from '@/lib/actions/dashboard';

interface StatsRowProps {
  stats: SystemStats;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  stripClass: string;
  iconBgClass: string;
  valueClass: string;
}

function StatCard({ label, value, icon, stripClass, iconBgClass, valueClass }: StatCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className={`h-1.5 ${stripClass}`} />
      <div className="p-5 flex items-center gap-4">
        <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${iconBgClass}`}>
          {icon}
        </div>
        <div>
          <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
    </article>
  );
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <section aria-label="portal statistics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Total Ideas"
        value={stats.totalSubmitted}
        icon={<Lightbulb className="h-5 w-5 text-brand-400" aria-hidden="true" />}
        stripClass="bg-brand-500"
        iconBgClass="bg-brand-500/20"
        valueClass="text-brand-400"
      />
      <StatCard
        label="Approved"
        value={stats.totalApproved}
        icon={<CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />}
        stripClass="bg-green-500"
        iconBgClass="bg-green-500/20"
        valueClass="text-green-400"
      />
      <StatCard
        label="In Pipeline"
        value={stats.totalInPipeline}
        icon={<Clock className="h-5 w-5 text-orange-400" aria-hidden="true" />}
        stripClass="bg-orange-500"
        iconBgClass="bg-orange-500/20"
        valueClass="text-orange-400"
      />
    </section>
  );
}
