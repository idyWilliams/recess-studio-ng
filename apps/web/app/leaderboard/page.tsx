'use client';

import { useState } from 'react';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization, loadStoredWallet } from '@/lib/wallet-store';
import { ChallengeGameModal } from '@/components/social/ChallengeGameModal';
import { PlayerMedallion } from '@/components/ui/PlayerMedallion';
import { triggerHaptic } from '@/lib/haptics';

interface LeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  flag: string;
  elo: number;
  isCurrentUser: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All Tables' },
  { id: 'word-battle', label: 'Word Battle' },
  { id: 'mancala', label: 'Mancala' },
  { id: 'whot', label: 'Whot!' },
  { id: 'ludo', label: 'Ludo' },
];

export default function LeaderboardPage() {
  const { profile } = useIdentity();
  const { stats } = useLiveStats();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDuelPlayer, setSelectedDuelPlayer] = useState<{
    id: string;
    username: string;
    displayName?: string;
    flag?: string;
    elo?: number;
  } | null>(null);

  const handleOpenDuel = (player: {
    id: string;
    username: string;
    displayName?: string;
    flag?: string;
    elo?: number;
  }) => {
    triggerHaptic('light');
    setSelectedDuelPlayer(player);
  };

  const customization = typeof window !== 'undefined' ? loadStoredCustomization() : { elo: 1200, flag: '🇳🇬' };

  // Combine real registered players from API and current user
  const playersMap = new Map<string, LeaderboardPlayer>();

  (stats?.recentPlayers ?? []).forEach((p, idx) => {
    playersMap.set(p.username.toLowerCase(), {
      rank: idx + 1,
      id: p.id,
      username: p.username,
      displayName: p.displayName || p.username,
      flag: p.countryFlag || '🇳🇬',
      elo: p.elo || 1200,
      isCurrentUser: p.username.toLowerCase() === profile?.username?.toLowerCase(),
    });
  });

  if (profile?.username) {
    const key = profile.username.toLowerCase();
    const existing = playersMap.get(key);
    if (!existing) {
      playersMap.set(key, {
        rank: 1,
        id: profile.id || profile.userId,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        flag: profile.countryFlag || customization.flag || '🇳🇬',
        elo: profile.elo || customization.elo || 1200,
        isCurrentUser: true,
      });
    } else {
      existing.isCurrentUser = true;
    }
  }

  const sortedPlayers = Array.from(playersMap.values()).sort((a, b) => b.elo - a.elo);
  sortedPlayers.forEach((p, index) => {
    p.rank = index + 1;
  });

  const totalRegistered = Math.max(sortedPlayers.length, stats?.totalRegisteredPlayers ?? 0);

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Top Header */}
      <header className="space-y-1.5 pt-2">
        <h1 className="text-2xl font-medium tracking-tight text-[#F4F4F0] sm:text-3xl">
          Standings
        </h1>
        <p className="text-xs text-[#8E8E93]">
          Official Elo ratings &bull; {totalRegistered} {totalRegistered === 1 ? 'member' : 'members'} ranked
        </p>
      </header>

      {/* Category Tabs: Minimalist with Hairline Active Underline */}
      <nav aria-label="Leaderboard categories" className="flex items-center gap-6 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveCategory(cat.id);
              }}
              className={`relative pb-3 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'text-[#F4F4F0]' : 'text-[#636366] hover:text-[#8E8E93]'
              }`}
            >
              <span>{cat.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#F4F4F0]" />
              )}
            </button>
          );
        })}
      </nav>

      {sortedPlayers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#121214] p-8 text-center space-y-2">
          <h2 className="text-sm font-medium text-[#F4F4F0]">No ratings recorded yet</h2>
          <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
            Play matches in the Lounge to record official Elo standings.
          </p>
        </div>
      ) : (
        <section aria-label="Rankings Table">
          <div className="rounded-2xl border border-white/[0.06] bg-[#121214] overflow-hidden divide-y divide-white/[0.05]">
            {sortedPlayers.map((player) => {
              const formattedRank = String(player.rank).padStart(2, '0');
              const isTop3 = player.rank <= 3;

              return (
                <div
                  key={player.username}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    player.isCurrentUser ? 'bg-white/[0.02]' : 'hover:bg-[#161619]'
                  }`}
                >
                  {/* Left: Rank + Medallion + Username */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-6 text-xs tabular-nums font-medium ${
                        isTop3 ? 'text-[#C8B28A]' : 'text-[#52525B]'
                      }`}
                    >
                      {formattedRank}
                    </span>

                    <PlayerMedallion
                      size="sm"
                      username={player.username}
                      displayName={player.displayName}
                      countryFlag={player.flag}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#F4F4F0] truncate">
                          @{player.username}
                        </p>
                        {player.isCurrentUser && (
                          <span className="text-[10px] text-[#C8B28A] tracking-wider uppercase">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Elo Rating + Challenge / Duel Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs tabular-nums font-medium text-[#F4F4F0]">
                      {player.elo} <span className="text-[10px] text-[#52525B] font-normal">Elo</span>
                    </span>

                    {!player.isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => handleOpenDuel(player)}
                        className="rounded-lg bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] text-xs font-medium px-3.5 py-1.5 transition-all active:scale-95"
                      >
                        Duel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
