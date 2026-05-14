import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardData } from '@/lib/actions/dashboard';
import { getSpotlightData } from '@/lib/actions/spotlight';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { UserStatsPanel } from '@/components/dashboard/UserStatsPanel';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { SpotlightCard } from '@/components/dashboard/SpotlightCard';
import { RecentlyApprovedFeed } from '@/components/dashboard/RecentlyApprovedFeed';
import { MonthlyActivityStrip } from '@/components/dashboard/MonthlyActivityStrip';
import { Lightbulb } from 'lucide-react';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const userName = session.user.name ?? 'there';
  const isAdmin = session.user.role === 'admin';

  const [{ systemStats, userStats, lastSubmission }, spotlightData] = await Promise.all([
    getDashboardData(),
    getSpotlightData(),
  ]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero greeting */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 px-8 py-10 text-white flex items-center justify-between border border-brand-800">
        <div className="space-y-1">
          <p className="text-brand-200 text-sm font-medium uppercase tracking-wider">Welcome back</p>
          <h1 className="text-3xl font-bold">{userName} 👋</h1>
          <p className="text-brand-200 text-sm mt-2">Here&apos;s what&apos;s happening in the innovation portal.</p>
        </div>
        <Lightbulb className="hidden sm:block h-16 w-16 text-accent-400 opacity-80" aria-hidden="true" />
      </div>

      {/* Monthly Activity Strip */}
      <MonthlyActivityStrip activity={spotlightData.monthlyActivity} />

      {/* Spotlight + Recently Approved */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Idea of the Month</h2>
          <SpotlightCard
            spotlight={spotlightData.spotlight}
            isAdmin={isAdmin}
            currentPickIdeaId={spotlightData.currentPickIdeaId}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently Approved</h2>
          <RecentlyApprovedFeed ideas={spotlightData.recentlyApproved} hasMore={spotlightData.hasMoreApproved} />
        </div>
      </div>

      {/* System-wide stats */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portal Overview</h2>
        <StatsRow stats={systemStats} />
      </div>

      {/* Personal stats + last submission */}
      <UserStatsPanel
        userStats={userStats}
        lastSubmission={lastSubmission}
        userName={userName}
      />

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <QuickActions />
      </div>
    </div>
  );
}
