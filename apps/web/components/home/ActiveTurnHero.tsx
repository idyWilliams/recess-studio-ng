import Link from 'next/link';
import { Button, PvPMatchup, TurnIndicator } from '@recess/ui';

export function ActiveTurnHero() {
  return (
    <section aria-label="Current Game" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-recess-text-muted">
          Your Turn
        </h2>
        <TurnIndicator status="your_turn" />
      </div>

      <PvPMatchup
        roundInfo="Word Battle • Round 4 of 5"
        playerOne={{
          id: 'p1',
          username: 'Chidi',
          avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
          score: 18,
          presence: 'online',
          isCurrentTurn: true,
        }}
        playerTwo={{
          id: 'p2',
          username: 'Tunde',
          avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
          score: 15,
          presence: 'in_game',
        }}
      />

      <div className="flex gap-2">
        <Link href="/games/word-battle" className="flex-1">
          <Button variant="primary" fullWidth size="md">
            Take Your Turn
          </Button>
        </Link>
        <Link href="/friends">
          <Button variant="secondary" size="md">
            Chat
          </Button>
        </Link>
      </div>
    </section>
  );
}
