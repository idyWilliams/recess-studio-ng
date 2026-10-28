'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/use-identity';
import { triggerHaptic } from '@/lib/haptics';

interface TargetPlayer {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
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
    icon: '🔤',
    badge: '1v1 Duel',
  },
  {
    id: 'whot',
    name: 'Whot! Naija Classic',
    tagline: 'Hold On, Pick Two & 20 WHOT!',
    icon: '🃏',
    badge: 'Card Battle',
  },
  {
    id: 'mancala',
    name: 'Mancala Royale',
    tagline: 'Ancient Kalah Pit Sowing Duel',
    icon: '🪨',
    badge: 'Strategy',
  },
  {
    id: 'ludo',
    name: 'Ludo Arena',
    tagline: '4-Quadrant Pawn Race & Knockouts',
    icon: '🎲',
    badge: 'Board Duel',
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
      setToastMessage(`⚡ Challenge sent to @${targetPlayer.username}'s WhatsApp & Recess Inbox! Entering arena...`);

      setTimeout(() => {
        onClose();
        router.push(data.matchUrl);
      }, 900);
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
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#12171D] p-5 shadow-2xl backdrop-blur-2xl text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {targetPlayer.avatarUrl && (
              <img
                src={targetPlayer.avatarUrl}
                alt={targetPlayer.username}
                className="h-8 w-8 rounded-full border border-white/20 bg-white/5"
              />
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00A884]">
                Direct Duel Challenge
              </span>
              <h3 className="text-base font-extrabold text-white">
                Duel @{targetPlayer.username}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {toastMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-2.5 text-center text-xs font-bold text-emerald-300 animate-pulse">
            {toastMessage}
          </div>
        )}

        <p className="text-xs text-white/60">
          Pick a game table. An alert will instantly be dispatched to @{targetPlayer.username}&apos;s Recess inbox and WhatsApp:
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
                className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                  isLoading
                    ? 'border-[#00A884] bg-[#00A884]/20'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-xl">
                    {game.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-white">{game.name}</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-bold text-white/60">
                        {game.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50">{game.tagline}</p>
                  </div>
                </div>

                <span className="text-sm font-bold text-[#00A884]">
                  {isLoading ? '...' : '⚔️'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
