'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/use-identity';
import { PlayerMedallion } from '@/components/ui/PlayerMedallion';
import { triggerHaptic } from '@/lib/haptics';

interface TargetPlayer {
  id: string;
  username: string;
  displayName?: string;
  flag?: string;
  elo?: number;
}

interface ChallengeGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlayer: TargetPlayer | null;
}

const DUEL_GAMES = [
  {
    id: 'word-battle',
    name: 'Word Battle',
    tagline: '5-Letter Tactical Vocabulary Duel',
    code: 'WB',
  },
  {
    id: 'whot',
    name: 'Whot! Naija Classic',
    tagline: 'Hold On, Pick Two & 20 WHOT!',
    code: 'WH',
  },
  {
    id: 'mancala',
    name: 'Mancala Royale',
    tagline: 'Ancient Kalah Pit Sowing Duel',
    code: 'MC',
  },
  {
    id: 'ludo',
    name: 'Ludo Arena',
    tagline: '4-Quadrant Pawn Race & Knockouts',
    code: 'LD',
  },
];

export function ChallengeGameModal({
  isOpen,
  onClose,
  targetPlayer,
}: ChallengeGameModalProps) {
  const router = useRouter();
  const { profile } = useIdentity();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !targetPlayer) return null;

  const handleSelectGame = async (gameId: string) => {
    setSelectedGame(gameId);
    setIsSending(true);
    triggerHaptic('medium');

    const challengerId = profile?.userId || profile?.id || 'guest_challenger';
    const challengerUsername = profile?.username || 'You';

    try {
      const res = await fetch('/backend-api/players/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengerId,
          challengerUsername,
          targetPlayerId: targetPlayer.id,
          targetUsername: targetPlayer.username,
          gameType: gameId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create challenge');
      }

      const data = await res.json();
      triggerHaptic('success');
      setToastMessage(`Invitation dispatched to @${targetPlayer.username}. Entering match...`);

      setTimeout(() => {
        onClose();
        router.push(data.matchUrl);
      }, 700);
    } catch {
      // Fallback: route directly to game
      router.push(`/games/${gameId}`);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214] p-5 shadow-2xl backdrop-blur-2xl text-[#F4F4F0] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <PlayerMedallion
              size="sm"
              username={targetPlayer.username}
              displayName={targetPlayer.displayName}
              countryFlag={targetPlayer.flag}
            />
            <div>
              <h3 className="text-base font-medium text-[#F4F4F0]">
                Duel @{targetPlayer.username}
              </h3>
              <p className="text-xs text-[#8E8E93]">
                {targetPlayer.elo ? `${targetPlayer.elo} Elo` : 'Direct Challenge'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] text-[#8E8E93] hover:text-[#F4F4F0] transition-colors"
          >
            ✕
          </button>
        </div>

        {toastMessage && (
          <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-2.5 text-center text-xs font-medium text-[#C8B28A]">
            {toastMessage}
          </div>
        )}

        <p className="text-xs text-[#8E8E93]">
          Select a table. An invite will be dispatched to @{targetPlayer.username}:
        </p>

        {/* Game Options List */}
        <div className="space-y-2">
          {DUEL_GAMES.map((game) => {
            const isLoading = isSending && selectedGame === game.id;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => handleSelectGame(game.id)}
                disabled={isSending}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                  isLoading
                    ? 'border-white/30 bg-[#1A1A20]'
                    : 'border-white/[0.06] bg-[#18181B] hover:bg-[#1E1E23]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#121214] text-xs font-semibold text-[#C8B28A]">
                    {game.code}
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-[#F4F4F0]">{game.name}</h4>
                    <p className="text-[11px] text-[#8E8E93]">{game.tagline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#8E8E93]">
                  {isLoading ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
                  ) : (
                    <span>&rarr;</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
