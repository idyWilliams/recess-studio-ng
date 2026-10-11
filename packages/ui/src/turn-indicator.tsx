export type MatchStatusState =
  'your_turn' | 'opponent_turn' | 'waiting' | 'victory' | 'defeat' | 'draw';

export interface TurnIndicatorProps {
  status: MatchStatusState;
  opponentName?: string | undefined;
  className?: string | undefined;
}

export function TurnIndicator({
  status,
  opponentName = 'Opponent',
  className = '',
}: TurnIndicatorProps) {
  switch (status) {
    case 'your_turn':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 rounded-full bg-recess-green-light px-3 py-1 text-xs font-bold text-recess-green-dot shadow-glow-green ${className}`}
        >
          <span className="h-2 w-2 rounded-full bg-recess-green animate-ping" />
          <span>Your turn</span>
        </div>
      );

    case 'opponent_turn':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 rounded-full bg-recess-cream-muted px-3 py-1 text-xs font-medium text-recess-text-secondary ${className}`}
        >
          <span className="h-2 w-2 rounded-full bg-neutral-400" />
          <span>Waiting for {opponentName}...</span>
        </div>
      );

    case 'waiting':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 rounded-full bg-recess-blue-light px-3 py-1 text-xs font-medium text-recess-blue ${className}`}
        >
          <span className="h-2 w-2 rounded-full bg-recess-blue animate-pulse" />
          <span>Waiting for player to join...</span>
        </div>
      );

    case 'victory':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 rounded-full bg-recess-gold-light px-3 py-1 text-xs font-bold text-recess-gold-dark shadow-glow-gold ${className}`}
        >
          <span>🏆 Victory!</span>
        </div>
      );

    case 'defeat':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-recess-text-secondary ${className}`}
        >
          <span>Match ended</span>
        </div>
      );

    case 'draw':
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-recess-text-secondary ${className}`}
        >
          <span>🤝 Tie game</span>
        </div>
      );
  }
}
