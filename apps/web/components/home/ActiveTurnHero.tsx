import Link from 'next/link';
import { Button, PvPMatchup, TurnIndicator } from '@recess/ui';

interface ActiveTurnHeroProps {
  playerScore?: number;
  opponentScore?: number;
  opponentUsername?: string;
  roundInfo?: string;
}

export function ActiveTurnHero({
  playerScore = 18,
  opponentScore = 15,
  opponentUsername = 'Tunde',
  roundInfo = 'Word Battle • Round 4 of 5',
}: ActiveTurnHeroProps) {
  return (
    <section
      aria-label="Current Game"
      className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 sm:p-5 backdrop-blur-2xl space-y-3.5 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">
            Active Match In Progress
          </h2>
        </div>
        <TurnIndicator status="your_turn" />
      </div>

      <PvPMatchup
        isDark={true}
        roundInfo={roundInfo}
        className="!border-white/10 !bg-white/[0.03]"
        playerOne={{
          id: 'p1',
          username: 'Chidi',
          avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
          score: playerScore,
          presence: 'online',
          isCurrentTurn: true,
        }}
        playerTwo={{
          id: 'p2',
          username: opponentUsername,
          avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
          score: opponentScore,
          presence: 'in_game',
        }}
      />

      <div className="flex gap-2 pt-1">
        <Link href="/games/word-battle" className="flex-1">
          <Button variant="primary" fullWidth size="md" className="!shadow-glow-purple">
            Take Your Turn (02:45)
          </Button>
        </Link>
        <Link href="/friends">
          <Button variant="secondary" size="md" className="!border-white/15 !bg-white/5 !text-white hover:!bg-white/10">
            Chat
          </Button>
        </Link>
      </div>
    </section>
  );
}
