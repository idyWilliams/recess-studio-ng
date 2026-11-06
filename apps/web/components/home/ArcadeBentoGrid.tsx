'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveStats } from '@/hooks/use-live-stats';
import { triggerHaptic } from '@/lib/haptics';

interface GameItem {
  id: 'word-battle' | 'mancala' | 'whot' | 'ludo';
  title: string;
  tagline: string;
  metadata: string;
  href: string;
}

const ARCADE_GAMES: GameItem[] = [
  {
    id: 'word-battle',
    title: 'Word Battle',
    tagline: 'Turn-based vocabulary showdown. Build high-scoring words and conquer the board.',
    metadata: '1v1 Duel &bull; 15s Turns',
    href: '/games/word-battle',
  },
  {
    id: 'mancala',
    title: 'Mancala Royale',
    tagline: 'Ancient pit-and-pebble African strategy. Sow seeds, capture stones, and rule the Kalah.',
    metadata: '1v1 Strategy &bull; 14 Pits',
    href: '/games/mancala',
  },
  {
    id: 'whot',
    title: 'Whot! Naija Classic',
    tagline: 'The iconic Nigerian street card duel. Hold on, pick two, and declare WHOT! to claim glory.',
    metadata: '2–4 Players &bull; Card Hand',
    href: '/games/whot',
  },
  {
    id: 'ludo',
    title: 'Ludo Arena',
    tagline: 'Roll the dice, race tokens home, and knock rival tokens off the track in high-stakes duels.',
    metadata: '2–4 Players &bull; Cross Track',
    href: '/games/ludo',
  },
];

function GameEmblem({ id }: { id: GameItem['id'] }) {
  if (id === 'word-battle') {
    return (
      <div className="flex items-center gap-2 select-none" aria-hidden="true">
        {['W', 'O', 'R', 'D'].map((char, i) => (
          <div
            key={char}
            className="flex h-10 w-9 flex-col items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24] shadow-sm"
          >
            <span className="text-sm font-semibold tracking-wide text-[#F4F4F0]">
              {char}
            </span>
            <span className="text-[9px] font-medium text-[#C8B28A] -mt-0.5">
              {[3, 1, 1, 2][i]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (id === 'mancala') {
    return (
      <div className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#1F1F24] px-4 py-2 select-none" aria-hidden="true">
        <div className="h-5 w-3.5 rounded-full border border-white/[0.12] bg-[#121214]" />
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((pit) => (
            <div
              key={pit}
              className="flex h-4 w-4 items-center justify-center rounded-full border border-white/[0.10] bg-[#121214]"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-[#C8B28A]" />
            </div>
          ))}
        </div>
        <div className="h-5 w-3.5 rounded-full border border-white/[0.12] bg-[#121214]" />
      </div>
    );
  }

  if (id === 'whot') {
    return (
      <div className="flex items-center gap-3 select-none" aria-hidden="true">
        {/* Circle */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#C8B28A]/60 bg-[#1F1F24]">
          <div className="h-2 w-2 rounded-full border border-[#F4F4F0]" />
        </div>
        {/* Triangle */}
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24]">
          <span className="text-xs text-[#F4F4F0]">&Delta;</span>
        </div>
        {/* Cross */}
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24]">
          <span className="text-xs text-[#F4F4F0]">&times;</span>
        </div>
        {/* Square */}
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24]">
          <div className="h-2 w-2 border border-[#F4F4F0]" />
        </div>
        {/* Star */}
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C8B28A]/60 bg-[#1F1F24]">
          <span className="text-xs text-[#C8B28A]">&lowast;</span>
        </div>
      </div>
    );
  }

  // Ludo cross track
  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.12] bg-[#1F1F24] select-none" aria-hidden="true">
      <div className="absolute h-10 w-3.5 rounded bg-white/[0.06] border border-white/[0.10]" />
      <div className="absolute h-3.5 w-10 rounded bg-white/[0.06] border border-white/[0.10]" />
      <div className="relative h-3 w-3 rotate-45 rounded-sm border border-[#C8B28A] bg-[#C8B28A]/20" />
    </div>
  );
}

export function ArcadeBentoGrid() {
  const router = useRouter();
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const { stats } = useLiveStats();

  const handleGameClick = (game: GameItem) => {
    if (loadingGameId) return;
    triggerHaptic('light');
    setLoadingGameId(game.id);
    router.push(game.href);
  };

  return (
    <section aria-label="Arcade Games" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide uppercase text-[#8E8E93]">
          Curated Tables
        </h2>
        <span className="text-xs text-[#52525B] tracking-tight">
          {stats ? `${stats.activeMatchesCount} Matches Live` : '4 Available'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ARCADE_GAMES.map((game) => (
          <div
            key={game.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#121214] p-6 hover:border-white/[0.12] transition-all"
          >
            {/* Museum-Grade Architectural Emblem Header */}
            <div className="relative flex h-32 w-full items-center justify-center rounded-xl border border-white/[0.04] bg-[#16161A] transition-colors group-hover:bg-[#1A1A20]">
              <GameEmblem id={game.id} />
            </div>

            {/* Content Section */}
            <div className="mt-4 flex flex-1 flex-col justify-between space-y-4">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-medium text-[#F4F4F0] tracking-tight">
                    {game.title}
                  </h3>
                  <span
                    className="text-xs text-[#52525B]"
                    dangerouslySetInnerHTML={{ __html: game.metadata }}
                  />
                </div>
                <p className="mt-1.5 text-sm text-[#8E8E93] leading-relaxed">
                  {game.tagline}
                </p>
              </div>

              {/* Clean Alabaster Action Button */}
              <div className="pt-2 border-t border-white/[0.04]">
                <button
                  type="button"
                  disabled={loadingGameId !== null}
                  onClick={() => handleGameClick(game)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] text-sm font-medium px-5 py-2.5 transition-all active:scale-[0.98] disabled:opacity-75"
                >
                  {loadingGameId === game.id ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-[#0A0A0B] border-t-transparent rounded-full animate-spin" />
                      <span>Setting up table...</span>
                    </>
                  ) : (
                    <span>Play</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
