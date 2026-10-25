'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization } from '@/lib/wallet-store';

interface GameItem {
  id: string;
  name: string;
  tagline: string;
  rulesSummary: string;
  badge: string;
  playersLabel: string;
  bannerUrl: string;
  href: string;
  accentColor: string;
}

const GAMES: GameItem[] = [
  {
    id: 'word-battle',
    name: 'Word Battle',
    tagline: 'Turn-based vocabulary showdown. Build high-scoring words and conquer the board.',
    rulesSummary: '3 Lives • 15s Per Turn • Letter Score Multipliers',
    badge: 'Featured • Live',
    playersLabel: '2 Players • Async / Live',
    bannerUrl: '/assets/games/banners/word-battle.svg',
    href: '/games/word-battle',
    accentColor: '#6C38FF',
  },
  {
    id: 'mancala',
    name: 'Mancala Royale',
    tagline: 'Ancient pit-and-pebble African strategy. Sow seeds, capture stones, and rule the Kalah.',
    rulesSummary: '12 Pits • Kalah Stores • Sowing & Capturing',
    badge: 'Popular • Classic',
    playersLabel: '2 Players • Turn-Based',
    bannerUrl: '/assets/games/banners/mancala-royale.svg',
    href: '/games/word-battle?mode=mancala',
    accentColor: '#F59E0B',
  },
  {
    id: 'whot',
    name: 'Whot! Naija Classic',
    tagline: 'The iconic Nigerian card battle. Hold on, pick two, and declare WHOT! to claim glory.',
    rulesSummary: 'Action Cards (1, 2, 8, 14, 20) • 5 Shapes • Quick Rounds',
    badge: 'Naija Classic',
    playersLabel: '2–4 Players • Fast-Paced',
    bannerUrl: '/assets/games/banners/whot.svg',
    href: '/games/word-battle?mode=whot',
    accentColor: '#10B981',
  },
  {
    id: 'ludo',
    name: 'Ludo Arena',
    tagline: 'Roll the dice, race tokens home, and knock rival tokens off the track in high-stakes duels.',
    rulesSummary: 'Roll 6 to Exit • Safe Stars • Knockout Bounties',
    badge: 'Multiplayer • Classic',
    playersLabel: '2–4 Players • Board Game',
    bannerUrl: '/assets/games/banners/ludo.svg',
    href: '/games/word-battle?mode=ludo',
    accentColor: '#EC4899',
  },
];

export default function GamesPage() {
  const [sharingGame, setSharingGame] = useState<string | null>(null);
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const handleShare = async (game: GameItem) => {
    setSharingGame(game.id);
    const myCustom = loadStoredCustomization();
    const myName = profile?.username || myCustom.rankTitle || 'Chidi';
    const siteUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio';
    const shareUrl = `${siteUrl}${game.href}`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: game.name,
        headline: `Play ${game.name} on Recess!`,
        statusBadge: 'CASUAL SOCIAL MATCH',
        playerOne: {
          name: myName,
          score: myCustom.elo || 1420,
          isCurrentTurn: true,
        },
        playerTwo: {
          name: 'You?',
          score: 1200,
          isCurrentTurn: false,
        },
      },
      shareTitle: `Play ${game.name} on Recess Studio`,
      shareText: `🎮 Join me for a match of ${game.name} on Recess Studio!\n\nNo download needed — plays right in your browser:\n${shareUrl}`,
      shareUrl,
      fallbackUrl: formatWhatsAppDeepLink(
        `🎮 Play ${game.name} with me on Recess Studio!\n\nJoin directly in your browser:\n${shareUrl}`,
      ),
    });

    setSharingGame(null);
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-recess-purple/20 text-xs shadow-glow-purple">
              🎮
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-recess-purple-light">
              Recess Arcade Cartridges
            </span>
          </div>
          {stats && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{stats.onlineNowCount} Online</span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Games Catalog
        </h1>
        <p className="text-xs text-white/50">
          Pick a title, challenge friends via WhatsApp, or climb ranked matchmaking. {stats ? `${stats.activeMatchesCount} active matches across ${stats.totalRegisteredPlayers} registered players.` : ''}
        </p>
      </header>

      {/* Catalog Grid */}
      <section aria-label="Games Catalog" className="space-y-4">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] p-4 backdrop-blur-2xl transition-all shadow-xl"
          >
            {/* Top SVG Banner */}
            <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-black/40 border border-white/5">
              <img
                src={game.bannerUrl}
                alt={`${game.name} Banner`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070B] via-transparent to-transparent" />

              {/* Badge Overlays */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 backdrop-blur-md border border-white/10">
                <span className="text-[10px] font-black text-amber-300">
                  {game.badge}
                </span>
              </div>
              <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/60 px-2 py-0.5 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/70">
                {game.playersLabel}
              </div>
            </div>

            {/* Content Details */}
            <div className="mt-3.5 space-y-1.5">
              <h2 className="text-lg font-black tracking-tight text-white">
                {game.name}
              </h2>
              <p className="text-xs text-white/60 leading-relaxed">
                {game.tagline}
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-white/40">
                <span>⚡ {game.rulesSummary}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 flex items-center gap-2 pt-2 border-t border-white/10">
              <Link
                href={game.href}
                className="flex-1 rounded-xl bg-gradient-to-r from-recess-purple to-recess-blue hover:from-recess-purple-hover hover:to-recess-blue/90 py-2.5 text-center text-xs font-black text-white shadow-glow-purple transition-all active:scale-95"
              >
                Play Now ⚔️
              </Link>
              <button
                type="button"
                onClick={() => handleShare(game)}
                disabled={sharingGame === game.id}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-3.5 py-2.5 text-xs font-bold text-emerald-300 transition-all active:scale-95 shadow-sm"
              >
                <img
                  src="/assets/shared/icons/icon-whatsapp.svg"
                  alt=""
                  className="h-4 w-4"
                />
                <span className="hidden xs:inline">Invite</span>
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
