'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useIdentity } from '@/hooks/use-identity';
import { PlayerMedallion } from '@/components/ui/PlayerMedallion';

interface ActiveTurnHeroProps {
  playerScore?: number;
  opponentScore?: number;
  opponentUsername?: string;
  roundInfo?: string;
  matchUrl?: string;
}

export function ActiveTurnHero({
  playerScore,
  opponentScore,
  opponentUsername,
  roundInfo,
  matchUrl,
}: ActiveTurnHeroProps) {
  const { profile } = useIdentity();
  const [activeMatchUrl, setActiveMatchUrl] = useState<string | null>(matchUrl ?? null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !matchUrl) {
      const stored = window.localStorage.getItem('recess.last_active_match');
      if (stored) {
        setActiveMatchUrl(stored);
      }
    }
  }, [matchUrl]);

  const hasActiveDuel = Boolean(opponentUsername && activeMatchUrl);

  // If no match is active, do not render a bulky empty box (Quiet Luxury constraint)
  if (!hasActiveDuel || !activeMatchUrl) {
    return null;
  }

  const myName = profile?.username ?? 'You';

  return (
    <section
      aria-label="Active Game"
      className="rounded-2xl border border-white/[0.06] bg-[#121214] p-4 sm:p-5 flex items-center justify-between gap-4 transition-all"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <PlayerMedallion size="md" username={opponentUsername} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#C8B28A]">
              Your Turn
            </span>
            {roundInfo && (
              <span className="text-xs text-[#52525B]">&bull; {roundInfo}</span>
            )}
          </div>
          <p className="text-sm font-medium text-[#F4F4F0] truncate">
            vs @{opponentUsername}
          </p>
          {playerScore !== undefined && opponentScore !== undefined && (
            <p className="text-xs text-[#8E8E93] tabular-nums">
              {playerScore} &ndash; {opponentScore}
            </p>
          )}
        </div>
      </div>

      <Link
        href={activeMatchUrl}
        className="shrink-0 rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] text-xs font-medium px-4 py-2.5 transition-all active:scale-95"
      >
        Resume Match
      </Link>
    </section>
  );
}
