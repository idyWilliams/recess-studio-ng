'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, PvPMatchup, TurnIndicator } from '@recess/ui';
import { useIdentity } from '@/hooks/use-identity';

interface ActiveTurnHeroProps {
  playerScore?: number;
  opponentScore?: number;
  opponentUsername?: string;
  roundInfo?: string;
  matchUrl?: string;
}

export function ActiveTurnHero({
  playerScore,
  opponentScore,
  opponentUsername,
  roundInfo,
  matchUrl,
}: ActiveTurnHeroProps) {
  const { profile } = useIdentity();
  const [activeMatchUrl, setActiveMatchUrl] = useState<string | null>(matchUrl ?? null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !matchUrl) {
      const stored = window.localStorage.getItem('recess.last_active_match');
      if (stored) {
        setActiveMatchUrl(stored);
      }
    }
  }, [matchUrl]);

  const hasActiveDuel = Boolean(opponentUsername && activeMatchUrl);

  if (!hasActiveDuel) {
    return (
      <section
        aria-label="Current Game Status"
        className="rounded-3xl border border-white/[0.08] bg-[#12171D] p-4 sm:p-5 backdrop-blur-2xl shadow-xl flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-lg">
            🎲
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              No active match in progress
            </h2>
            <p className="text-xs text-white/50 truncate">
              Pick a table below to start a duel.
            </p>
          </div>
        </div>
        <Link
          href="/games"
          className="shrink-0 rounded-xl bg-[#00A884] hover:bg-[#008f6f] px-3.5 py-2 text-xs font-bold text-[#06130F] transition-all active:scale-95 shadow-glow-green"
        >
          Play &rarr;
        </Link>
      </section>
    );
  }

  const myName = profile?.username ?? 'You';

  return (
    <section
      aria-label="Current Game"
      className="rounded-3xl border border-white/[0.08] bg-[#12171D] p-4 sm:p-5 backdrop-blur-2xl space-y-3.5 shadow-xl"
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
        roundInfo={roundInfo ?? 'Active Duel'}
        className="!border-white/10 !bg-white/[0.03]"
        playerOne={{
          id: 'p1',
          username: myName,
          avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
          score: playerScore ?? 0,
          presence: 'online',
          isCurrentTurn: true,
        }}
        playerTwo={{
          id: 'p2',
          username: opponentUsername ?? 'Rival',
          avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
          score: opponentScore ?? 0,
          presence: 'in_game',
        }}
      />

      <div className="flex gap-2 pt-1">
        <Link href={activeMatchUrl ?? '/games'} className="flex-1">
          <Button
            variant="primary"
            fullWidth
            size="md"
            className="!bg-[#00A884] hover:!bg-[#008f6f] !text-[#06130F] !font-bold !shadow-glow-green"
          >
            Take Your Turn &rarr;
          </Button>
        </Link>
        <Link href="/friends">
          <Button
            variant="secondary"
            size="md"
            className="!border-white/15 !bg-white/5 !text-white hover:!bg-white/10"
          >
            Social
          </Button>
        </Link>
      </div>
    </section>
  );
}
