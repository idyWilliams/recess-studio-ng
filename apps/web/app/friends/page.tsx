'use client';

import { useState } from 'react';
import { WhatsAppInviteCard } from '@/components/social/WhatsAppInviteCard';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';
import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';
import { loadStoredCustomization } from '@/lib/wallet-store';

interface FriendEntry {
  id: string;
  username: string;
  avatarUrl: string;
  flag: string;
  country: string;
  rating: number;
  presence: 'online' | 'in_game' | 'offline';
  statusText: string;
  topGame: string;
  isRealPlayer?: boolean;
}

const mockFriends: FriendEntry[] = [
  {
    id: 'f1',
    username: 'Tunde',
    avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
    flag: '🇳🇬',
    country: 'Nigeria',
    rating: 1690,
    presence: 'in_game',
    statusText: 'In match • Word Battle',
    topGame: 'Word Battle',
  },
  {
    id: 'f2',
    username: 'Amina',
    avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
    flag: '🇬🇭',
    country: 'Ghana',
    rating: 1610,
    presence: 'online',
    statusText: 'Online • Ready to duel',
    topGame: 'Whot! Naija',
  },
  {
    id: 'f3',
    username: 'Efe',
    avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
    flag: '🇳🇬',
    country: 'Nigeria',
    rating: 1570,
    presence: 'online',
    statusText: 'Online • Looking for Ludo match',
    topGame: 'Ludo Arena',
  },
  {
    id: 'f4',
    username: 'Kofi',
    avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
    flag: '🇬🇭',
    country: 'Ghana',
    rating: 1530,
    presence: 'offline',
    statusText: 'Last seen 2h ago',
    topGame: 'Mancala Royale',
  },
];

export default function FriendsPage() {
  const [challengingFriend, setChallengingFriend] = useState<string | null>(null);
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const liveFriends: FriendEntry[] = (stats?.recentPlayers ?? [])
    .filter((p) => p.username !== profile?.username)
    .map((p) => {
      const avatarSlug = p.avatarId ? (p.avatarId.startsWith('avatar-') ? p.avatarId : `avatar-${p.avatarId}`) : 'avatar-chidi';
      return {
        id: p.id,
        username: p.username,
        avatarUrl: `/assets/shared/avatars/${avatarSlug}.svg`,
        flag: p.countryFlag || '🇳🇬',
        country: 'West Africa',
        rating: p.elo || 1200,
        presence: p.isOnline ? 'online' : 'offline',
        statusText: p.isOnline ? '🟢 Online • Ready to duel' : 'Recent Recess Player',
        topGame: 'Word Battle',
        isRealPlayer: true,
      };
    });

  const displayFriends = [
    ...liveFriends,
    ...mockFriends.filter(
      (m) => !liveFriends.some((l) => l.username.toLowerCase() === m.username.toLowerCase()),
    ),
  ];

  const handleChallengeFriend = async (friend: FriendEntry) => {
    setChallengingFriend(friend.id);
    const myCustom = loadStoredCustomization();
    const myName = profile?.username || myCustom.rankTitle || 'Chidi';
    const siteUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio';
    const matchUrl = `${siteUrl}/games/word-battle`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: friend.topGame,
        headline: `⚔️ Challenge vs @${friend.username}!`,
        statusBadge: `${friend.rating} ELO • DUEL READY`,
        playerOne: {
          name: myName,
          score: myCustom.elo || 1420,
          isCurrentTurn: true,
        },
        playerTwo: {
          name: friend.username,
          score: friend.rating,
          isCurrentTurn: false,
        },
      },
      shareTitle: `Duel @${friend.username} on Recess Studio`,
      shareText: `⚔️ @${friend.username}, I challenge you to a duel on Recess Studio!\n\nAccept directly in browser:\n${matchUrl}`,
      shareUrl: matchUrl,
      fallbackUrl: formatWhatsAppDeepLink(
        `⚔️ @${friend.username}, I challenge you to a duel on Recess Studio!\n\nJoin match:\n${matchUrl}`,
      ),
    });

    setChallengingFriend(null);
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs shadow-glow-emerald">
            👥
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
            Social Gaming Circle
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Friends & Social
        </h1>
        <p className="text-xs text-white/50">
          Find opponents, invite WhatsApp contacts, and jump straight into 1v1 duels.
        </p>
      </header>

      {/* WhatsApp Doorway Card */}
      <WhatsAppInviteCard
        title="Invite WhatsApp Friends"
        description="Share a match invite into any WhatsApp chat or group. Real-time updates without leaving your conversation."
        tone="dark"
      />

      {/* Active Friends List */}
      <section aria-label="Recent Opponents" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-white/50">
            Recent Opponents ({displayFriends.length})
          </h2>
          <span className="text-[11px] font-bold text-emerald-400">
            ● {stats?.onlineNowCount ?? 2} Online Now
          </span>
        </div>

        <div className="space-y-2.5">
          {displayFriends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] p-3.5 backdrop-blur-xl transition-all shadow-md"
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
                    className={`absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-[#05070B] ${
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
                    {friend.isRealPlayer && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-300">
                        Live
                      </span>
                    )}
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
                onClick={() => handleChallengeFriend(friend)}
                disabled={challengingFriend === friend.id}
                className="rounded-xl border border-recess-purple/40 bg-gradient-to-r from-recess-purple/30 to-recess-blue/20 hover:from-recess-purple hover:to-recess-blue px-3.5 py-2 text-xs font-black text-white shadow-glow-purple transition-all active:scale-95 disabled:opacity-50"
              >
                {challengingFriend === friend.id ? 'Launching...' : '⚔️ Challenge'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
