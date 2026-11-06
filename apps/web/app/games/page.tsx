'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization } from '@/lib/wallet-store';
import { triggerHaptic } from '@/lib/haptics';

interface GameItem {
  id: 'word-battle' | 'mancala' | 'whot' | 'ludo';
  name: string;
  tagline: string;
  rulesSummary: string;
  playersLabel: string;
  href: string;
}

const GAMES: GameItem[] = [
  {
    id: 'word-battle',
    name: 'Word Battle',
    tagline: 'Turn-based vocabulary showdown. Build high-scoring words and conquer the board.',
    rulesSummary: '15s Turns &bull; Multipliers',
    playersLabel: '2 Players',
    href: '/games/word-battle',
  },
  {
    id: 'mancala',
    name: 'Mancala Royale',
    tagline: 'Ancient pit-and-pebble African strategy. Sow seeds, capture stones, and rule the Kalah.',
    rulesSummary: '14 Pits &bull; Kalah Sowing',
    playersLabel: '2 Players',
    href: '/games/mancala',
  },
  {
    id: 'whot',
    name: 'Whot! Naija Classic',
    tagline: 'The iconic Nigerian street card duel. Hold on, pick two, and declare WHOT! to claim glory.',
    rulesSummary: '5 Shapes &bull; Action Cards',
    playersLabel: '2–4 Players',
    href: '/games/whot',
  },
  {
    id: 'ludo',
    name: 'Ludo Arena',
    tagline: 'Roll the dice, race tokens home, and knock rival tokens off the track in high-stakes duels.',
    rulesSummary: 'Safe Stars &bull; Knockouts',
    playersLabel: '2–4 Players',
    href: '/games/ludo',
  },
];

function GameCatalogEmblem({ id }: { id: GameItem['id'] }) {
  if (id === 'word-battle') {
    return (
      <div className="flex items-center gap-2 select-none" aria-hidden="true">
        {['W', 'O', 'R', 'D'].map((char, i) => (
          <div
            key={char}
            className="flex h-10 w-9 flex-col items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24]"
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
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#C8B28A]/60 bg-[#1F1F24]">
          <div className="h-2 w-2 rounded-full border border-[#F4F4F0]" />
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24]">
          <span className="text-xs text-[#F4F4F0]">&Delta;</span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24]">
          <span className="text-xs text-[#F4F4F0]">&times;</span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.12] bg-[#1F1F24]">
          <div className="h-2 w-2 border border-[#F4F4F0]" />
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C8B28A]/60 bg-[#1F1F24]">
          <span className="text-xs text-[#C8B28A]">&lowast;</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.12] bg-[#1F1F24] select-none" aria-hidden="true">
      <div className="absolute h-10 w-3.5 rounded bg-white/[0.06] border border-white/[0.10]" />
      <div className="absolute h-3.5 w-10 rounded bg-white/[0.06] border border-white/[0.10]" />
      <div className="relative h-3 w-3 rotate-45 rounded-sm border border-[#C8B28A] bg-[#C8B28A]/20" />
    </div>
  );
}

export default function GamesPage() {
  const router = useRouter();
  const [sharingGame, setSharingGame] = useState<string | null>(null);
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const handlePlayGame = (game: GameItem) => {
    triggerHaptic('light');
    setLoadingGameId(game.id);
    router.push(game.href);
  };

  const handleShare = async (game: GameItem) => {
    setSharingGame(game.id);
    const myCustom = loadStoredCustomization();
    const myName = profile?.username || myCustom.rankTitle || 'Player';
    const siteUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio';
    const shareUrl = `${siteUrl}${game.href}`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: game.name,
        headline: `Play ${game.name} on Recess`,
        statusBadge: 'CASUAL SOCIAL MATCH',
        playerOne: {
          name: myName,
          score: myCustom.elo || 1200,
          isCurrentTurn: true,
        },
        playerTwo: {
          name: 'You?',
          score: 1200,
          isCurrentTurn: false,
        },
      },
      shareTitle: `Play ${game.name} on Recess Studio`,
      shareText: `Join me for a match of ${game.name} on Recess Studio:\n\n${shareUrl}`,
      shareUrl,
      fallbackUrl: formatWhatsAppDeepLink(
        `Play ${game.name} with me on Recess Studio:\n\n${shareUrl}`,
      ),
    });

    setSharingGame(null);
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header */}
      <header className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
          <span className="text-xs text-[#8E8E93] tracking-tight">
            {stats ? `${stats.onlineNowCount} Online in Recess` : 'Games Catalog'}
          </span>
        </div>
        <h1 className="text-2xl font-medium tracking-tight text-[#F4F4F0] sm:text-3xl">
          Games Catalog
        </h1>
        <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed max-w-md">
          Pick a title, challenge friends via WhatsApp, or climb ranked matchmaking.
        </p>
      </header>

      {/* Catalog Grid */}
      <section aria-label="Games Catalog" className="space-y-4">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#121214] p-6 hover:border-white/[0.12] transition-all"
          >
            {/* Architectural Vector Header */}
            <div className="relative flex h-32 w-full items-center justify-center rounded-xl border border-white/[0.04] bg-[#16161A] transition-colors group-hover:bg-[#1A1A20]">
              <GameCatalogEmblem id={game.id} />
              <div className="absolute bottom-2.5 right-2.5 rounded-md bg-[#121214]/80 px-2 py-0.5 border border-white/[0.06] text-[10px] text-[#8E8E93]">
                {game.playersLabel}
              </div>
            </div>

            {/* Content Details */}
            <div className="mt-4 flex flex-1 flex-col justify-between space-y-4">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-medium text-[#F4F4F0] tracking-tight">
                    {game.name}
                  </h2>
                  <span
                    className="text-xs text-[#52525B]"
                    dangerouslySetInnerHTML={{ __html: game.rulesSummary }}
                  />
                </div>
                <p className="mt-1.5 text-sm text-[#8E8E93] leading-relaxed">
                  {game.tagline}
                </p>
              </div>

              {/* Actions Bar: Alabaster Primary + Ghost Secondary */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => handlePlayGame(game)}
                  disabled={loadingGameId === game.id}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] text-sm font-medium py-2.5 transition-all active:scale-[0.98] disabled:opacity-75"
                >
                  {loadingGameId === game.id ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0B] border-t-transparent animate-spin" />
                      <span>Setting up table...</span>
                    </>
                  ) : (
                    <span>Play</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(game)}
                  disabled={sharingGame === game.id}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] px-4 py-2.5 text-xs font-medium text-[#E4E4E0] transition-all active:scale-95 disabled:opacity-75"
                >
                  <span>Invite</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
