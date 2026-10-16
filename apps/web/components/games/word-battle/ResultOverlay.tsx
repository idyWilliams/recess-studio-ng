'use client';

import Link from 'next/link';

import { Button } from '@recess/ui';
import type { WordBattleResult } from '@recess/game-word-battle';

import type { SessionPlayerView } from '@/lib/word-battle-view';

interface ResultOverlayProps {
  result: WordBattleResult;
  players: SessionPlayerView[];
  myUserId: string | null;
}

/** Final match result rendered only from the server-confirmed `result` payload. */
export function ResultOverlay({ result, players, myUserId }: ResultOverlayProps) {
  const isDraw = result.isDraw;
  const winner = players.find((player) => player.userId === result.winnerId);
  const loser = players.find((player) => player.userId !== result.winnerId);
  const viewerWon = myUserId !== null && result.winnerId === myUserId;

  const headline = isDraw ? 'Tie Game' : viewerWon ? 'Victory!' : 'Defeat';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse 70% 55% at 15% 10%, rgba(108,56,255,0.28) 0%, transparent 70%), rgba(10,14,26,0.92)',
        backdropFilter: 'blur(6px)',
      }}
      role="alertdialog"
      aria-label="Match result"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center text-white"
        style={{
          background: 'linear-gradient(160deg, #161D2F 0%, #0D111C 60%, #111828 100%)',
          border: '1px solid rgba(108,56,255,0.35)',
          boxShadow: '0 0 40px rgba(108,56,255,0.35), 0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        {!isDraw && (
          <img
            src="/assets/games/word-battle/icons/word-battle-crown.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto h-10 w-10 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
          />
        )}

        <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
          {headline}
        </h2>

        <p className="mt-1 text-xs text-neutral-400">
          {isDraw
            ? 'Neither player took the crown.'
            : `${winner?.username ?? 'Player'} takes the duel${
                result.isKnockout ? ' by knockout' : ''
              }.`}
        </p>

        {result.isKnockout && !isDraw && (
          <span
            className="mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-recess-gold"
            style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.35)',
            }}
          >
            KO
          </span>
        )}

        {/* Final scores and lives straight from the server result */}
        <div className="mt-4 space-y-1.5">
          {players.map((player) => (
            <div
              key={player.userId}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="flex items-center gap-2 font-semibold">
                {result.winnerId === player.userId && !isDraw && (
                  <img
                    src="/assets/games/word-battle/icons/word-battle-crown.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                )}
                {player.username}
              </span>
              <span className="flex items-center gap-3 text-xs">
                <span className="font-bold tabular-nums text-white">
                  {result.scores[player.userId] ?? 0} pts
                </span>
                <span className="tabular-nums text-neutral-400">
                  {result.lives[player.userId] ?? 0} lives
                </span>
              </span>
            </div>
          ))}
        </div>

        {loser && !isDraw && (
          <p className="mt-2 text-[10px] text-neutral-600">
            Final: {winner?.username} {result.scores[result.winnerId ?? ''] ?? 0} —{' '}
            {result.scores[loser.userId] ?? 0} {loser.username}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Link href="/games/word-battle" className="block">
            <Button variant="primary" size="lg" fullWidth>
              Play Again
            </Button>
          </Link>
          <Link
            href="/games"
            className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Back to Games
          </Link>
        </div>
      </div>
    </div>
  );
}
