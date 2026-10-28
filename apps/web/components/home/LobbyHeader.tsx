'use client';

import Link from 'next/link';
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
  rivalUsername,
  userScore,
  rivalScore,
  hasActiveTurn = false,
  activeMatchId,
}: LobbyHeaderProps) {
  const { profile } = useIdentity();
  const { stats } = useLiveStats();

  const greetingName = profile?.username
    ? `@${profile.username}`
    : username || 'Player';

  const onlineCount = stats?.onlineNowCount ?? 0;
  const registeredCount = stats?.totalRegisteredPlayers ?? 0;

  return (
    <section className="space-y-4">
      {/* Live Platform Telemetry Pill */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow-glow-green backdrop-blur-xl">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>
            {onlineCount} {onlineCount === 1 ? 'Player' : 'Players'} Online • {registeredCount} Registered in Recess
          </span>
        </div>
      </div>

      {/* Top Active Turn Ticker if real active turn exists */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {hasActiveTurn && rivalUsername ? (
          <Link
            href={activeMatchId ? `/games/word-battle/${activeMatchId}` : '/games/word-battle'}
            className="group inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow-glow-green backdrop-blur-xl transition-all active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Your Turn vs @{rivalUsername}</span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
            <span>Ready for a new duel • Pick a table below</span>
          </div>
        )}

        {/* Real Rivalry Pill only if real data is supplied */}
        {userScore !== undefined && rivalScore !== undefined && rivalUsername && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-300 shadow-glow-gold backdrop-blur-xl">
            <span className="text-sm">🔥</span>
            <span>
              Rivalry: You <span className="font-extrabold text-white">{userScore}</span> -{' '}
              <span className="font-extrabold text-white">{rivalScore}</span> @{rivalUsername}
            </span>
          </div>
        )}
      </div>

      {/* Main Greeting & Arcade Hero Callout */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#12171D] p-5 sm:p-6 backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30">
                Recess Arcade 2.0
              </span>
              <span className="text-xs text-white/50">• West Africa Gaming Hub</span>
            </div>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Welcome to the Lounge, <span className="text-[#00A884]">{greetingName}</span>
            </h1>
            <p className="mt-1 text-xs text-white/70 sm:text-sm max-w-md">
              Step up to the tables. Challenge friends over WhatsApp or enter the universal matchmaking queues.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:self-center">
            <Link
              href="/games/word-battle"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#00A884] hover:bg-[#008f6f] px-4 py-2.5 text-xs font-extrabold text-[#06130F] shadow-glow-green transition-all active:scale-95"
            >
              <span>⚔️</span>
              <span>Quick 1v1 Battle</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
