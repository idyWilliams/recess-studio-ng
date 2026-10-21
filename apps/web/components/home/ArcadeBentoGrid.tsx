'use client';

import { useState } from 'react';
import Link from 'next/link';

interface GameItem {
  id: string;
  title: string;
  tagline: string;
  badge: { text: string; color: string; bg: string; border: string; glow?: string };
  players: string;
  matchType: string;
  bannerUrl: string;
  href: string;
  isAvailable: boolean;
  accentGradient: string;
}

const ARCADE_GAMES: GameItem[] = [
  {
    id: 'word-battle',
    title: 'Word Battle',
    tagline: 'High-stakes tactical vocabulary duels. Form 5-letter words before the turn deadline.',
    badge: {
      text: 'LIVE NOW',
      color: 'text-emerald-300',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/40',
      glow: 'shadow-glow-green',
    },
    players: '2,480 Active',
    matchType: '1v1 Duel • 5 Rounds',
    bannerUrl: '/assets/games/banners/word-battle.svg',
    href: '/games/word-battle',
    isAvailable: true,
    accentGradient: 'from-recess-purple to-recess-blue',
  },
  {
    id: 'mancala',
    title: 'Mancala Royale',
    tagline: 'Ancient Kalah-6 pit sowing. Relay seeds, trigger extra turns, and sweep opponent stores.',
    badge: {
      text: 'NEW CARTRIDGE',
      color: 'text-amber-300',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/40',
      glow: 'shadow-glow-gold',
    },
    players: '1,920 Active',
    matchType: '1v1 Strategy • 14 Pits',
    bannerUrl: '/assets/games/banners/mancala-royale.svg',
    href: '/games/mancala',
    isAvailable: true,
    accentGradient: 'from-amber-500 to-emerald-600',
  },
  {
    id: 'whot',
    title: 'Whot! Naija Classic',
    tagline: "West Africa's beloved card duel. Star, Cross, Triangle, and the game-breaking 20 WHOT!",
    badge: {
      text: 'UPCOMING',
      color: 'text-rose-300',
      bg: 'bg-rose-500/20',
      border: 'border-rose-500/40',
    },
    players: '3,150 Waiting',
    matchType: '2–4 Players • Card Hand',
    bannerUrl: '/assets/games/banners/whot.svg',
    href: '#whot-waitlist',
    isAvailable: false,
    accentGradient: 'from-rose-500 to-amber-500',
  },
  {
    id: 'ludo',
    title: 'Ludo Arena',
    tagline: 'The legendary 4-quadrant token race. Roll lucky 6s, knock opponents out, and crown your pawns.',
    badge: {
      text: 'UPCOMING',
      color: 'text-blue-300',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/40',
    },
    players: '4,820 Waiting',
    matchType: '4 Players • Board Race',
    bannerUrl: '/assets/games/banners/ludo.svg',
    href: '#ludo-waitlist',
    isAvailable: false,
    accentGradient: 'from-blue-600 to-purple-600',
  },
];

export function ArcadeBentoGrid() {
  const [notifiedGame, setNotifiedGame] = useState<string | null>(null);

  const handleNotify = (gameId: string) => {
    setNotifiedGame(gameId);
    setTimeout(() => setNotifiedGame(null), 3000);
  };

  return (
    <section aria-label="Arcade Games Bento Grid" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
            Arcade Tables
          </span>
          <h2 className="text-lg font-black text-white">Select Your Arena</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
          4 Games Available
        </span>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ARCADE_GAMES.map((game) => {
          return (
            <div
              key={game.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-2xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-2xl"
            >
              {/* Banner Graphic with Rich SVGs */}
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black/40">
                <img
                  src={game.bannerUrl}
                  alt={game.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Status Badge in Top Corner */}
                <div className="absolute left-3 top-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider ${game.badge.bg} ${game.badge.color} ${game.badge.border} ${game.badge.glow ?? ''}`}
                  >
                    {game.isAvailable && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    {game.badge.text}
                  </span>
                </div>

                {/* Match Type Pill */}
                <div className="absolute bottom-3 right-3">
                  <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-md">
                    {game.matchType}
                  </span>
                </div>
              </div>

              {/* Game Metadata Content */}
              <div className="mt-3.5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-white group-hover:text-recess-purple-light transition-colors">
                      {game.title}
                    </h3>
                    <span className="text-[11px] font-semibold text-white/50">
                      👥 {game.players}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-white/60 line-clamp-2 leading-relaxed">
                    {game.tagline}
                  </p>
                </div>

                {/* Tactile Action Button */}
                <div className="mt-4 pt-2 border-t border-white/[0.06]">
                  {game.isAvailable ? (
                    <Link
                      href={game.href}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-recess-purple to-recess-blue py-2.5 text-xs font-extrabold text-white shadow-glow-purple transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
                    >
                      <span>Play Now</span>
                      <span className="text-sm">&rarr;</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleNotify(game.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-extrabold text-white/80 transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
                    >
                      {notifiedGame === game.id ? (
                        <span className="text-amber-300">✓ On Waitlist!</span>
                      ) : (
                        <span>🔔 Notify on Launch</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
