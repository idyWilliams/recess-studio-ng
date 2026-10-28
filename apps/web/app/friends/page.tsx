'use client';

import { useState } from 'react';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization } from '@/lib/wallet-store';
import { ChallengeGameModal } from '@/components/social/ChallengeGameModal';

interface FriendEntry {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  flag: string;
  rating: number;
  presence: 'online' | 'in_game' | 'offline';
  statusText: string;
}

export default function FriendsPage() {
  const [selectedDuelPlayer, setSelectedDuelPlayer] = useState<FriendEntry | null>(null);
  const [isInvitingExternal, setIsInvitingExternal] = useState(false);
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const displayFriends: FriendEntry[] = (stats?.recentPlayers ?? [])
    .filter((p) => p.username.toLowerCase() !== profile?.username?.toLowerCase())
    .map((p) => {
      const avatarSlug = p.avatarId
        ? p.avatarId.startsWith('avatar-')
          ? p.avatarId
          : `avatar-${p.avatarId}`
        : 'avatar-chidi';
      return {
        id: p.id,
        username: p.username,
        displayName: p.displayName || p.username,
        avatarUrl: `/assets/shared/avatars/${avatarSlug}.svg`,
        flag: p.countryFlag || '🇳🇬',
        rating: p.elo || 1200,
        presence: p.isOnline ? 'online' : 'offline',
        statusText: p.isOnline ? '🟢 Online • Ready to duel' : 'Active Recess Player',
      };
    });

  const handleInviteExternal = async () => {
    setIsInvitingExternal(true);
    const myCustom = loadStoredCustomization();
    const myName = profile?.username || 'You';
    const siteUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio';
    const matchUrl = `${siteUrl}/games`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: 'Recess Studio Arcade',
        headline: `⚔️ Play against @${myName} on Recess!`,
        statusBadge: 'DUEL INVITATION',
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
      shareTitle: 'Play on Recess Studio',
      shareText: `⚔️ Join me for a game on Recess Studio!\n\nPlay directly in your browser:\n${matchUrl}`,
      shareUrl: matchUrl,
      fallbackUrl: formatWhatsAppDeepLink(
        `⚔️ Join me for a game on Recess Studio!\n\nPlay directly in your browser:\n${matchUrl}`,
      ),
    });

    setIsInvitingExternal(false);
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header with Compact Single-Row Action */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs shadow-glow-emerald">
              👥
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
              Social Gaming Circle
            </span>
          </div>

          {/* Compact Single-Row Invite Action */}
          <button
            type="button"
            onClick={handleInviteExternal}
            disabled={isInvitingExternal}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-all active:scale-95 shadow-sm"
          >
            <span>+</span>
            <span>Invite External Friend</span>
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Friends & Social
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Challenge registered players directly or invite any WhatsApp contact.
          </p>
        </div>
      </header>

      {/* Active Friends List */}
      <section aria-label="Registered Players" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-white/50">
            Registered Opponents ({displayFriends.length})
          </h2>
          <span className="text-[11px] font-bold text-emerald-400">
            ● {stats?.onlineNowCount ?? 0} Online Now
          </span>
        </div>

        {displayFriends.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#12171D] p-6 text-center backdrop-blur-xl space-y-2">
            <div className="text-2xl">🎮</div>
            <h3 className="text-sm font-bold text-white">No other registered players yet</h3>
            <p className="text-xs text-white/50 max-w-xs mx-auto">
              Tap &ldquo;+ Invite External Friend&rdquo; above to share a direct challenge link into any WhatsApp chat or group!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#12171D] hover:bg-[#181F27] p-3.5 backdrop-blur-xl transition-all shadow-md"
              >
                {/* Left Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <img
                      src={friend.avatarUrl}
                      alt={friend.username}
                      className="h-11 w-11 rounded-full border border-white/20 bg-white/5"
                    />
                    <span className="absolute -bottom-1 -right-1 text-xs">
                      {friend.flag}
                    </span>
                    {/* Presence indicator */}
                    <span
                      className={`absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-[#0B0E11] ${
                        friend.presence === 'online'
                          ? 'bg-emerald-500 shadow-glow-emerald'
                          : friend.presence === 'in_game'
                          ? 'bg-amber-400'
                          : 'bg-white/30'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-black text-white truncate">
                        @{friend.username}
                      </p>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-300">
                        Live
                      </span>
                      <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-300">
                        {friend.rating} Elo
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 truncate">
                      {friend.statusText}
                    </p>
                  </div>
                </div>

                {/* Right Challenge Action */}
                <button
                  type="button"
                  onClick={() => setSelectedDuelPlayer(friend)}
                  className="rounded-xl bg-[#00A884] hover:bg-[#008f6f] px-3.5 py-2 text-xs font-black text-[#06130F] shadow-glow-green transition-all active:scale-95"
                >
                  ⚔️ Challenge
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 1-Tap Pick Game Duel Selector Modal */}
      <ChallengeGameModal
        isOpen={Boolean(selectedDuelPlayer)}
        onClose={() => setSelectedDuelPlayer(null)}
        targetPlayer={selectedDuelPlayer}
      />
    </main>
  );
}
