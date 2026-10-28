'use client';

import { useState } from 'react';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization, loadStoredWallet } from '@/lib/wallet-store';
import { ChallengeGameModal } from '@/components/social/ChallengeGameModal';

interface LeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  flag: string;
  avatarUrl: string;
  elo: number;
  coins: number;
  isCurrentUser: boolean;
}

export default function LeaderboardPage() {
  const { profile } = useIdentity();
  const { stats } = useLiveStats();
  const [selectedDuelPlayer, setSelectedDuelPlayer] = useState<{
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    elo?: number;
  } | null>(null);

  const wallet = typeof window !== 'undefined' ? loadStoredWallet() : { coins: 1000 };
  const customization = typeof window !== 'undefined' ? loadStoredCustomization() : { elo: 1200, flag: '🇳🇬' };

  // Combine real registered players from API and current user
  const playersMap = new Map<string, LeaderboardPlayer>();

  // Add players from live stats
  (stats?.recentPlayers ?? []).forEach((p, idx) => {
    const avatarSlug = p.avatarId
      ? p.avatarId.startsWith('avatar-')
        ? p.avatarId
        : `avatar-${p.avatarId}`
      : 'avatar-chidi';
    playersMap.set(p.username.toLowerCase(), {
      rank: idx + 1,
      id: p.id,
      username: p.username,
      displayName: p.displayName || p.username,
      flag: p.countryFlag || '🇳🇬',
      avatarUrl: `/assets/shared/avatars/${avatarSlug}.svg`,
      elo: p.elo || 1200,
      coins: 1000,
      isCurrentUser: p.username.toLowerCase() === profile?.username?.toLowerCase(),
    });
  });

  // Ensure current logged-in user is included
  if (profile?.username) {
    const key = profile.username.toLowerCase();
    const existing = playersMap.get(key);
    if (!existing) {
      const avatarSlug = profile.avatarId
        ? profile.avatarId.startsWith('avatar-')
          ? profile.avatarId
          : `avatar-${profile.avatarId}`
        : 'avatar-chidi';
      playersMap.set(key, {
        rank: 1,
        id: profile.id || profile.userId,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        flag: profile.countryFlag || customization.flag || '🇳🇬',
        avatarUrl: `/assets/shared/avatars/${avatarSlug}.svg`,
        elo: profile.elo || customization.elo || 1200,
        coins: wallet.coins || 1000,
        isCurrentUser: true,
      });
    } else {
      existing.isCurrentUser = true;
      existing.coins = wallet.coins || existing.coins;
    }
  }

  // Sort by Elo descending and assign ranks
  const sortedPlayers = Array.from(playersMap.values()).sort((a, b) => b.elo - a.elo);
  sortedPlayers.forEach((p, index) => {
    p.rank = index + 1;
  });

  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];
  const ladder = sortedPlayers.slice(3);

  const totalRegistered = Math.max(sortedPlayers.length, stats?.totalRegisteredPlayers ?? 0);

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
          Real-time ELO ratings of registered Recess Studio players. ({totalRegistered} {totalRegistered === 1 ? 'Player' : 'Players'} Registered)
        </p>
      </header>

      {sortedPlayers.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#12171D] p-8 text-center backdrop-blur-2xl space-y-3">
          <span className="text-3xl">👑</span>
          <h2 className="text-base font-bold text-white">No Registered Players Yet</h2>
          <p className="text-xs text-white/50 max-w-xs mx-auto">
            Connect your WhatsApp profile to claim the #1 spot on the leaderboard!
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Visual Display */}
          <section aria-label="Top 3 Podium" className="relative pt-4">
            {/* Ambient Top Glow */}
            <div className="pointer-events-none absolute -top-8 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />

            <div className="grid grid-cols-3 gap-2.5 items-end">
              {/* #2 Rank (Silver) */}
              {second ? (
                <div className="flex flex-col items-center rounded-2xl border border-slate-400/30 bg-[#12171D] p-3 text-center backdrop-blur-xl">
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
                  {!second.isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => setSelectedDuelPlayer(second)}
                      className="mt-2.5 w-full rounded-lg bg-[#00A884] hover:bg-[#008f6f] py-1 text-[10px] font-extrabold text-[#06130F] transition-all active:scale-95 shadow-glow-green"
                    >
                      ⚔️ Duel
                    </button>
                  )}
                  {second.isCurrentUser && (
                    <span className="mt-2.5 rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                      You
                    </span>
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* #1 Rank (Gold - Elevated) */}
              {first && (
                <div className="relative -top-2 flex flex-col items-center rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-500/20 via-[#12171D] to-[#12171D] p-3.5 text-center shadow-glow-gold backdrop-blur-2xl">
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
                  {!first.isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => setSelectedDuelPlayer(first)}
                      className="mt-2.5 w-full rounded-lg bg-[#00A884] hover:bg-[#008f6f] py-1.5 text-[11px] font-black text-[#06130F] transition-all active:scale-95 shadow-glow-green"
                    >
                      ⚔️ Challenge
                    </button>
                  )}
                  {first.isCurrentUser && (
                    <span className="mt-2.5 rounded bg-amber-400/25 px-2 py-0.5 text-[10px] font-black text-amber-200">
                      ★ You (Leader)
                    </span>
                  )}
                </div>
              )}

              {/* #3 Rank (Bronze) */}
              {third ? (
                <div className="flex flex-col items-center rounded-2xl border border-amber-700/30 bg-[#12171D] p-3 text-center backdrop-blur-xl">
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
                  {!third.isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => setSelectedDuelPlayer(third)}
                      className="mt-2.5 w-full rounded-lg bg-[#00A884] hover:bg-[#008f6f] py-1 text-[10px] font-extrabold text-[#06130F] transition-all active:scale-95 shadow-glow-green"
                    >
                      ⚔️ Duel
                    </button>
                  )}
                  {third.isCurrentUser && (
                    <span className="mt-2.5 rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                      You
                    </span>
                  )}
                </div>
              ) : (
                <div />
              )}
            </div>
          </section>

          {/* Ladder (Ranks 4+) */}
          {ladder.length > 0 && (
            <section aria-label="Ranked Ladder" className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-white/50">
                Ranked Ladder • Contenders
              </h2>

              <div className="space-y-2">
                {ladder.map((player) => (
                  <div
                    key={player.username}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#12171D] hover:bg-[#181F27] p-3 backdrop-blur-xl transition-all"
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
                          {player.isCurrentUser && (
                            <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-extrabold text-emerald-300">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/50">
                          {player.elo} Elo
                        </p>
                      </div>
                    </div>

                    {/* Right Action */}
                    <div className="flex items-center gap-2">
                      {!player.isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => setSelectedDuelPlayer(player)}
                          className="rounded-xl bg-[#00A884] hover:bg-[#008f6f] px-3 py-1.5 text-xs font-black text-[#06130F] shadow-glow-green transition-all active:scale-95"
                        >
                          ⚔️ Challenge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* 1-Tap Pick Game Duel Selector Modal */}
      <ChallengeGameModal
        isOpen={Boolean(selectedDuelPlayer)}
        onClose={() => setSelectedDuelPlayer(null)}
        targetPlayer={selectedDuelPlayer}
      />
    </main>
  );
}
