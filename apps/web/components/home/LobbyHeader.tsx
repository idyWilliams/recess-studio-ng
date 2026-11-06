'use client';

import { useIdentity } from '@/hooks/use-identity';
import { useLiveStats } from '@/hooks/use-live-stats';

interface LobbyHeaderProps {
  username?: string;
  rivalUsername?: string;
  userScore?: number;
  rivalScore?: number;
  hasActiveTurn?: boolean;
  activeMatchId?: string;
}

export function LobbyHeader({
  username,
}: LobbyHeaderProps) {
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const greetingName = profile?.username
    ? `@${profile.username}`
    : username ? `@${username}` : '@Player';

  const onlineCount = stats?.onlineNowCount ?? 0;

  // Time-aware calm greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <section className="space-y-2 pt-2">
      {/* Top Meta Line: Single 6px green dot with calm pewter text */}
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
        <span className="text-xs text-[#8E8E93] tracking-tight">
          Online &bull; {onlineCount} {onlineCount === 1 ? 'Player' : 'Players'} in Lounge
        </span>
      </div>

      {/* Editorial Headline */}
      <h1 className="text-2xl font-medium tracking-tight text-[#F4F4F0] sm:text-3xl">
        {getGreeting()}, <span className="text-[#F4F4F0]">{greetingName}</span>
      </h1>

      {/* Understated sub-label */}
      <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed max-w-md">
        Select a table to challenge friends or enter open matchmaking.
      </p>
    </section>
  );
}
