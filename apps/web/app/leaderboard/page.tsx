'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization } from '@/lib/wallet-store';

interface LeaderboardEntry {
  rank: number;
  username: string;
  flag: string;
  country: string;
  avatarUrl: string;
  elo: number;
  coins: number;
  streak: number;
  winRate: number;
  topGame: string;
}

const CATEGORIES = [
  'All Games',
  'Word Battle',
  'Mancala Royale',
  'Whot! Naija',
  'Ludo Arena',
] as const;

type Category = (typeof CATEGORIES)[number];

const LEADERBOARD_DATA: Record<Category, LeaderboardEntry[]> = {
  'All Games': [
    {
      rank: 1,
      username: 'Grandmaster',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
      elo: 1840,
      coins: 12500,
      streak: 8,
      winRate: 84,
      topGame: 'Word Battle',
    },
    {
      rank: 2,
      username: 'tunde',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
      elo: 1690,
      coins: 8200,
      streak: 5,
      winRate: 76,
      topGame: 'Mancala Royale',
    },
    {
      rank: 3,
      username: 'amina',
      flag: '🇬🇭',
      country: 'Ghana',
      avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
      elo: 1610,
      coins: 6400,
      streak: 4,
      winRate: 72,
      topGame: 'Whot! Naija',
    },
    {
      rank: 4,
      username: 'efe',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
      elo: 1570,
      coins: 5800,
      streak: 5,
      winRate: 69,
      topGame: 'Ludo Arena',
    },
    {
      rank: 5,
      username: 'kofi',
      flag: '🇬🇭',
      country: 'Ghana',
      avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
      elo: 1530,
      coins: 4900,
      streak: 3,
      winRate: 67,
      topGame: 'Mancala Royale',
    },
    {
      rank: 6,
      username: 'chidi_pro',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
      elo: 1480,
      coins: 4200,
      streak: 4,
      winRate: 65,
      topGame: 'Word Battle',
    },
    {
      rank: 7,
      username: 'zainab',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
      elo: 1440,
      coins: 3800,
      streak: 2,
      winRate: 63,
      topGame: 'Whot! Naija',
    },
    {
      rank: 8,
      username: 'kwame_x',
      flag: '🇬🇭',
      country: 'Ghana',
      avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
      elo: 1410,
      coins: 3200,
      streak: 2,
      winRate: 61,
      topGame: 'Ludo Arena',
    },
    {
      rank: 9,
      username: 'bolanle',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
      elo: 1390,
      coins: 2900,
      streak: 1,
      winRate: 59,
      topGame: 'Word Battle',
    },
    {
      rank: 10,
      username: 'emeka_royale',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
      elo: 1360,
      coins: 2400,
      streak: 3,
      winRate: 58,
      topGame: 'Mancala Royale',
    },
  ],
  'Word Battle': [
    {
      rank: 1,
      username: 'Grandmaster',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
      elo: 1840,
      coins: 12500,
      streak: 8,
      winRate: 84,
      topGame: 'Word Battle',
    },
    {
      rank: 2,
      username: 'chidi_pro',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
      elo: 1650,
      coins: 7400,
      streak: 6,
      winRate: 75,
      topGame: 'Word Battle',
    },
    {
      rank: 3,
      username: 'bolanle',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
      elo: 1580,
      coins: 5900,
      streak: 4,
      winRate: 70,
      topGame: 'Word Battle',
    },
    {
      rank: 4,
      username: 'tunde',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
      elo: 1540,
      coins: 5100,
      streak: 3,
      winRate: 67,
      topGame: 'Word Battle',
    },
    {
      rank: 5,
      username: 'amina',
      flag: '🇬🇭',
      country: 'Ghana',
      avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
      elo: 1490,
      coins: 4300,
      streak: 2,
      winRate: 64,
      topGame: 'Word Battle',
    },
  ],
  'Mancala Royale': [
    {
      rank: 1,
      username: 'tunde',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
      elo: 1720,
      coins: 9100,
      streak: 7,
      winRate: 80,
      topGame: 'Mancala Royale',
    },
    {
      rank: 2,
      username: 'kofi',
      flag: '🇬🇭',
      country: 'Ghana',
      avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
      elo: 1640,
      coins: 7200,
      streak: 5,
      winRate: 74,
      topGame: 'Mancala Royale',
    },
    {
      rank: 3,
      username: 'emeka_royale',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
      elo: 1580,
      coins: 5800,
      streak: 4,
      winRate: 69,
      topGame: 'Mancala Royale',
    },
    {
      rank: 4,
      username: 'Grandmaster',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
      elo: 1550,
      coins: 5000,
      streak: 3,
      winRate: 66,
      topGame: 'Mancala Royale',
    },
  ],
  'Whot! Naija': [
    {
      rank: 1,
      username: 'amina',
      flag: '🇬🇭',
      country: 'Ghana',
      avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
      elo: 1750,
      coins: 9800,
      streak: 9,
      winRate: 82,
      topGame: 'Whot! Naija',
    },
    {
      rank: 2,
      username: 'zainab',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
      elo: 1630,
      coins: 6900,
      streak: 5,
      winRate: 73,
      topGame: 'Whot! Naija',
    },
    {
      rank: 3,
      username: 'efe',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
      elo: 1590,
      coins: 6100,
      streak: 4,
      winRate: 71,
      topGame: 'Whot! Naija',
    },
  ],
  'Ludo Arena': [
    {
      rank: 1,
      username: 'efe',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
      elo: 1710,
      coins: 8900,
      streak: 6,
      winRate: 78,
      topGame: 'Ludo Arena',
    },
    {
      rank: 2,
      username: 'kwame_x',
      flag: '🇬🇭',
      country: 'Ghana',
      avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
      elo: 1620,
      coins: 6800,
      streak: 5,
      winRate: 73,
      topGame: 'Ludo Arena',
    },
    {
      rank: 3,
      username: 'tunde',
      flag: '🇳🇬',
      country: 'Nigeria',
      avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
      elo: 1560,
      coins: 5300,
      streak: 3,
      winRate: 68,
      topGame: 'Ludo Arena',
    },
  ],
};

export default function LeaderboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All Games');
  const [challengingUser, setChallengingUser] = useState<string | null>(null);
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const baseEntries = LEADERBOARD_DATA[selectedCategory] || LEADERBOARD_DATA['All Games'];

  const realContenders: LeaderboardEntry[] = (stats?.recentPlayers ?? []).map((p, idx) => {
    const avatarSlug = p.avatarId ? (p.avatarId.startsWith('avatar-') ? p.avatarId : `avatar-${p.avatarId}`) : 'avatar-chidi';
    return {
      rank: idx + 1,
      username: p.username,
      flag: p.countryFlag || '🇳🇬',
      country: 'West Africa',
      avatarUrl: `/assets/shared/avatars/${avatarSlug}.svg`,
      elo: p.elo || 1200,
      coins: 2000 + (p.elo ? (p.elo - 1000) * 5 : 500),
      streak: 1,
      winRate: 68,
      topGame: 'Word Battle',
    };
  });

  const entries = [
    ...realContenders,
    ...baseEntries.filter(
      (b) => !realContenders.some((r) => r.username.toLowerCase() === b.username.toLowerCase()),
    ),
  ].map((item, idx) => ({ ...item, rank: idx + 1 }));

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  const ladder = entries.slice(3);

  const handleChallenge = async (target: LeaderboardEntry) => {
    setChallengingUser(target.username);
    const myCustom = loadStoredCustomization();
    const myName = profile?.username || myCustom.rankTitle || 'Chidi';
    const siteUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio';
    const challengeUrl = `${siteUrl}/games/word-battle`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: selectedCategory === 'All Games' ? 'Recess Arcade Duel' : selectedCategory,
        headline: `⚔️ Challenge @${target.username}!`,
        statusBadge: `${target.elo} ELO • RANK #${target.rank}`,
        playerOne: {
          name: myName,
          score: myCustom.elo || 1420,
          isCurrentTurn: true,
        },
        playerTwo: {
          name: target.username,
          score: target.elo,
          isCurrentTurn: false,
        },
      },
      shareTitle: `Recess Studio Challenge vs @${target.username}`,
      shareText: `⚔️ @${target.username}, you've been challenged on Recess Studio!\n\nCan you defend your Rank #${target.rank} (${target.elo} Elo)?\n\nPlay in browser:\n${challengeUrl}`,
      shareUrl: challengeUrl,
      fallbackUrl: formatWhatsAppDeepLink(
        `⚔️ @${target.username}, you've been challenged on Recess Studio!\n\nCan you defend your Rank #${target.rank} (${target.elo} Elo)?\n\nAccept challenge:\n${challengeUrl}`,
      ),
    });

    setChallengingUser(null);
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Top Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs shadow-glow-gold">
            🏆
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
            Official Ranked Ladders
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Arcade Leaderboard
        </h1>
        <p className="text-xs text-white/50">
          Climb tiers, earn Recess Coins, and challenge Africa's top casual gamers. {stats ? `(${stats.onlineNowCount} online now • ${stats.totalRegisteredPlayers} registered)` : ''}
        </p>
      </header>

      {/* Category Filter Pills */}
      <nav
        aria-label="Leaderboard category filters"
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                isActive
                  ? 'border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 shadow-glow-gold'
                  : 'border border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </nav>

      {/* Top 3 Podium Visual Display */}
      <section aria-label="Top 3 Podium" className="relative pt-4">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-8 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="grid grid-cols-3 gap-2.5 items-end">
          {/* #2 Rank (Silver) */}
          {second && (
            <div className="flex flex-col items-center rounded-2xl border border-slate-400/30 bg-slate-400/[0.06] p-3 text-center backdrop-blur-xl">
              <span className="rounded-full bg-slate-400/20 px-2 py-0.5 text-[10px] font-black text-slate-300">
                🥈 #2
              </span>
              <div className="relative mt-2">
                <img
                  src={second.avatarUrl}
                  alt={second.username}
                  className="h-11 w-11 rounded-full border-2 border-slate-300 bg-white/10"
                />
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {second.flag}
                </span>
              </div>
              <p className="mt-2 text-xs font-black text-white truncate max-w-full">
                @{second.username}
              </p>
              <p className="text-[11px] font-extrabold text-amber-300">
                {second.elo} Elo
              </p>
              <p className="text-[9px] text-white/40">
                🪙 {second.coins.toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => handleChallenge(second)}
                disabled={challengingUser === second.username}
                className="mt-2.5 w-full rounded-lg bg-white/10 hover:bg-white/20 py-1 text-[10px] font-extrabold text-white transition-all active:scale-95"
              >
                ⚔️ Duel
              </button>
            </div>
          )}

          {/* #1 Rank (Gold - Elevated) */}
          {first && (
            <div className="relative -top-2 flex flex-col items-center rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent p-3.5 text-center shadow-glow-gold backdrop-blur-2xl">
              <div className="flex items-center gap-1 rounded-full bg-amber-400/30 px-2.5 py-0.5 text-[10px] font-black text-amber-200">
                👑 🥇 #1
              </div>
              <div className="relative mt-2">
                <img
                  src={first.avatarUrl}
                  alt={first.username}
                  className="h-14 w-14 rounded-full border-2 border-amber-400 bg-white/10 shadow-glow-gold"
                />
                <span className="absolute -bottom-1 -right-1 text-sm">
                  {first.flag}
                </span>
              </div>
              <p className="mt-2 text-sm font-black text-white truncate max-w-full">
                @{first.username}
              </p>
              <p className="text-xs font-black text-amber-300">
                {first.elo} Elo
              </p>
              <p className="text-[10px] text-white/50">
                🪙 {first.coins.toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => handleChallenge(first)}
                disabled={challengingUser === first.username}
                className="mt-2.5 w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-1.5 text-[11px] font-black text-black transition-all active:scale-95 shadow-md"
              >
                ⚔️ Challenge
              </button>
            </div>
          )}

          {/* #3 Rank (Bronze) */}
          {third && (
            <div className="flex flex-col items-center rounded-2xl border border-amber-700/30 bg-amber-700/[0.06] p-3 text-center backdrop-blur-xl">
              <span className="rounded-full bg-amber-700/20 px-2 py-0.5 text-[10px] font-black text-amber-400">
                🥉 #3
              </span>
              <div className="relative mt-2">
                <img
                  src={third.avatarUrl}
                  alt={third.username}
                  className="h-11 w-11 rounded-full border-2 border-amber-700 bg-white/10"
                />
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {third.flag}
                </span>
              </div>
              <p className="mt-2 text-xs font-black text-white truncate max-w-full">
                @{third.username}
              </p>
              <p className="text-[11px] font-extrabold text-amber-300">
                {third.elo} Elo
              </p>
              <p className="text-[9px] text-white/40">
                🪙 {third.coins.toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => handleChallenge(third)}
                disabled={challengingUser === third.username}
                className="mt-2.5 w-full rounded-lg bg-white/10 hover:bg-white/20 py-1 text-[10px] font-extrabold text-white transition-all active:scale-95"
              >
                ⚔️ Duel
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Ladder (Ranks 4-10) */}
      <section aria-label="Ranked Ladder" className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-white/50">
          Ranked Ladder • Contenders
        </h2>

        <div className="space-y-2">
          {ladder.map((player) => (
            <div
              key={player.username}
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] p-3 backdrop-blur-xl transition-all"
            >
              {/* Left Rank & Avatar */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-center text-xs font-black text-white/40">
                  #{player.rank}
                </span>
                <div className="relative">
                  <img
                    src={player.avatarUrl}
                    alt={player.username}
                    className="h-10 w-10 rounded-full border border-white/20 bg-white/5"
                  />
                  <span className="absolute -bottom-1 -right-1 text-xs">
                    {player.flag}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-white truncate">
                      @{player.username}
                    </p>
                    <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-extrabold text-rose-300">
                      🔥 {player.streak}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50">
                    {player.elo} Elo • {player.winRate}% win rate
                  </p>
                </div>
              </div>

              {/* Right Action */}
              <div className="flex items-center gap-2">
                <span className="hidden xs:inline text-[11px] font-bold text-amber-300">
                  🪙 {player.coins.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleChallenge(player)}
                  disabled={challengingUser === player.username}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-extrabold text-emerald-300 transition-all active:scale-95 shadow-sm"
                >
                  {challengingUser === player.username ? '...' : '⚔️ Challenge'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
