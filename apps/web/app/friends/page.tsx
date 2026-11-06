'use client';

import { useState } from 'react';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization } from '@/lib/wallet-store';
import { ChallengeGameModal } from '@/components/social/ChallengeGameModal';
import { PlayerMedallion } from '@/components/ui/PlayerMedallion';
import { triggerHaptic } from '@/lib/haptics';

interface FriendEntry {
  id: string;
  username: string;
  displayName: string;
  flag: string;
  rating: number;
  isOnline: boolean;
}

export default function FriendsPage() {
  const [selectedDuelPlayer, setSelectedDuelPlayer] = useState<FriendEntry | null>(null);
  const [isInvitingExternal, setIsInvitingExternal] = useState(false);
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const displayFriends: FriendEntry[] = (stats?.recentPlayers ?? [])
    .filter((p) => p.username.toLowerCase() !== profile?.username?.toLowerCase())
    .map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName || p.username,
      flag: p.countryFlag || '🇳🇬',
      rating: p.elo || 1200,
      isOnline: Boolean(p.isOnline),
    }));

  const handleInviteExternal = async () => {
    triggerHaptic('light');
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
        headline: `Play with @${myName} on Recess`,
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
      shareText: `Join me for a game on Recess Studio:\n\n${matchUrl}`,
      shareUrl: matchUrl,
      fallbackUrl: formatWhatsAppDeepLink(
        `Join me for a game on Recess Studio:\n\n${matchUrl}`,
      ),
    });

    setIsInvitingExternal(false);
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Top Row Header: Directory Title + Invite via WhatsApp */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[#F4F4F0] sm:text-3xl">
            Directory
          </h1>
          <p className="mt-1 text-xs text-[#8E8E93]">
            {displayFriends.length} players registered &bull; {stats?.onlineNowCount ?? 0} online
          </p>
        </div>

        <button
          type="button"
          onClick={handleInviteExternal}
          disabled={isInvitingExternal}
          className="rounded-lg border border-white/[0.08] bg-[#161619] hover:bg-[#222227] px-3.5 py-2 text-xs font-medium text-[#F4F4F0] transition-all active:scale-95 disabled:opacity-75"
        >
          {isInvitingExternal ? 'Sharing...' : 'Invite via WhatsApp'}
        </button>
      </header>

      {/* Unified Player Directory Container */}
      <section aria-label="Player Directory">
        {displayFriends.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#121214] p-8 text-center space-y-2">
            <h2 className="text-sm font-medium text-[#F4F4F0]">No opponents registered yet</h2>
            <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
              Tap &ldquo;Invite via WhatsApp&rdquo; above to share a direct match invitation with contacts or groups.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-[#121214] overflow-hidden divide-y divide-white/[0.05]">
            {displayFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-4 hover:bg-[#161619] transition-colors"
              >
                {/* Left Identity: Medallion + Username + Elo */}
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerMedallion
                    size="md"
                    username={friend.username}
                    displayName={friend.displayName}
                    countryFlag={friend.flag}
                    isOnline={friend.isOnline}
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F4F4F0] truncate">
                      @{friend.username}
                    </p>
                    <p className="text-xs text-[#8E8E93] tabular-nums">
                      {friend.rating} Elo
                    </p>
                  </div>
                </div>

                {/* Right Action: Clean Alabaster Challenge Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedDuelPlayer(friend);
                  }}
                  className="rounded-lg bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] text-xs font-medium px-3.5 py-1.5 transition-all active:scale-95"
                >
                  Challenge
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
