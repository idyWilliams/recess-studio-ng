import type { ReactNode } from 'react';
import { Button } from './button.js';

export interface GameCardProps {
  id: string;
  name: string;
  tagline: string;
  badge?: string | undefined;
  playersLabel?: string | undefined;
  artworkIcon?: ReactNode | undefined;
  onPlay?: (() => void) | undefined;
  playLabel?: string | undefined;
  isDark?: boolean | undefined;
  className?: string | undefined;
}

export function GameCard({
  name,
  tagline,
  badge = 'Featured',
  playersLabel = '2 Players',
  artworkIcon,
  onPlay,
  playLabel = 'Play',
  isDark = false,
  className = '',
}: GameCardProps) {
  const containerClasses = isDark
    ? 'bg-recess-navy-card text-white border-recess-navy-border hover:border-recess-purple'
    : 'bg-white text-recess-text-primary border-recess-cream-border hover:border-recess-purple-light';

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 shadow-card transition-all hover:shadow-card-hover ${containerClasses} ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="rounded-full bg-recess-purple-light px-2.5 py-0.5 text-[11px] font-bold text-recess-purple">
            {badge}
          </span>
          <span className="text-xs font-medium text-recess-text-muted">
            {playersLabel}
          </span>
        </div>

        <div className="flex items-start gap-3.5 mb-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-recess-purple to-recess-blue text-white shadow-glow-purple">
            {artworkIcon ?? <span className="text-xl">⚔️</span>}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-base font-bold tracking-tight text-inherit">{name}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-recess-text-secondary">
              {tagline}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button
          variant={isDark ? 'primary' : 'primary'}
          size="md"
          fullWidth
          onClick={onPlay}
        >
          {playLabel}
        </Button>
      </div>
    </div>
  );
}
