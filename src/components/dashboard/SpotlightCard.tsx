import Link from 'next/link';
import { Lightbulb, Star, Crown } from 'lucide-react';
import type { SpotlightIdea } from '@/lib/actions/spotlight';
import { pinEditorsPickAction, unpinEditorsPickAction } from '@/lib/actions/spotlight';

interface SpotlightCardProps {
  spotlight: SpotlightIdea | null;
  isAdmin: boolean;
  currentPickIdeaId: string | null;
}

const LABEL_STYLES: Record<string, string> = {
  'Top Rated': 'bg-brand-500/20 text-brand-400 border border-brand-800',
  "Editor's Pick": 'bg-yellow-500/20 text-yellow-400 border border-yellow-800',
  'Score Pending': 'bg-secondary text-muted-foreground border border-border',
};

const LABEL_ICONS: Record<string, React.ReactNode> = {
  'Top Rated': <Star className="h-3 w-3" aria-hidden="true" />,
  "Editor's Pick": <Crown className="h-3 w-3" aria-hidden="true" />,
  'Score Pending': null,
};

export function SpotlightCard({ spotlight, isAdmin, currentPickIdeaId }: SpotlightCardProps) {
  if (!spotlight) {
    return (
      <section aria-label="Idea of the Month">
        <div className="rounded-xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/20">
            <Lightbulb className="h-6 w-6 text-brand-400" aria-hidden="true" />
          </span>
          <p className="text-muted-foreground text-sm">
            No spotlight yet this month — submit your best idea!
          </p>
        </div>
      </section>
    );
  }

  const isPinned = spotlight.id === currentPickIdeaId;
  const scoreText = spotlight.compositeScore !== null
    ? `${spotlight.compositeScore.toFixed(1)} / 5`
    : null;

  return (
    <section aria-label="Idea of the Month">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col gap-3">
          {/* Label badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${LABEL_STYLES[spotlight.label] ?? LABEL_STYLES['Score Pending']}`}>
              {LABEL_ICONS[spotlight.label]}
              {spotlight.label}
            </span>
          </div>

          {/* Title */}
          <Link href={`/ideas/${spotlight.id}`} aria-label={spotlight.title} className="group">
            <h3 className="font-bold text-lg text-foreground group-hover:text-brand-400 transition-colors leading-snug">
              {spotlight.title}
            </h3>
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{spotlight.authorName}</span>
            <span>{spotlight.category}</span>
            {scoreText ? (
              <span className="font-semibold text-brand-400">{scoreText}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-2 pt-1">
              {isPinned ? (
                <form action={unpinEditorsPickAction}>
                  <button
                    type="submit"
                    className="text-xs rounded-md border border-border px-3 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Unpin
                  </button>
                </form>
              ) : (
                <form action={pinEditorsPickAction}>
                  <input type="hidden" name="ideaId" value={spotlight.id} />
                  <button
                    type="submit"
                    className="text-xs rounded-md border border-yellow-800 px-3 py-1 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                  >
                    Pin as Editor&apos;s Pick
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
