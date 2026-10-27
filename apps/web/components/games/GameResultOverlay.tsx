'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@recess/ui';

export interface GameResultOverlayProps {
  title?: string;
  gameName: string;
  winnerId: string | null;
  winnerName?: string;
  isDraw?: boolean;
  myUserId: string | null;
  playerOne: { id: string; name: string; score: number };
  playerTwo: { id: string; name: string; score: number };
  onPlayAgain?: () => void;
  onShareWhatsApp?: () => void;
  homeHref?: string;
}

export function GameResultOverlay({
  title,
  gameName,
  winnerId,
  winnerName,
  isDraw = false,
  myUserId,
  playerOne,
  playerTwo,
  onPlayAgain,
  onShareWhatsApp,
  homeHref = '/games',
}: GameResultOverlayProps) {
  const viewerWon = myUserId !== null && winnerId === myUserId;
  const headline = isDraw
    ? '🤝 TIE GAME'
    : viewerWon
    ? '🏆 VICTORY!'
    : winnerName
    ? `👑 ${winnerName.toUpperCase()} WINS!`
    : 'MATCH FINISHED';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="alertdialog"
      aria-label="Match result"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-stone-900/95 p-6 text-center space-y-5 shadow-2xl">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-400/30 text-3xl shadow-glow-gold">
          {isDraw ? '🤝' : viewerWon ? '🏆' : '👑'}
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            {gameName} Recap
          </span>
          <h2 className="text-2xl font-black text-white mt-1">{headline}</h2>
          {title && <p className="text-xs text-white/60 mt-1">{title}</p>}
        </div>

        {/* Score comparison card */}
        <div className="flex items-center justify-around p-4 rounded-2xl bg-white/[0.04] border border-white/10">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-white/70">{playerOne.name}</span>
            <span className="text-xl font-black text-white mt-0.5">{playerOne.score}</span>
            {winnerId === playerOne.id && (
              <span className="text-[10px] font-bold text-emerald-400 mt-1">Winner</span>
            )}
          </div>

          <span className="text-xs font-black text-white/30">VS</span>

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-white/70">{playerTwo.name}</span>
            <span className="text-xl font-black text-white mt-0.5">{playerTwo.score}</span>
            {winnerId === playerTwo.id && (
              <span className="text-[10px] font-bold text-emerald-400 mt-1">Winner</span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-2">
          {onShareWhatsApp && (
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-glow-emerald hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Share Victory to WhatsApp</span>
              <span>💬</span>
            </button>
          )}

          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="w-full py-3.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-black text-sm transition-all"
            >
              Play Again ↺
            </button>
          )}

          <Link
            href={homeHref}
            className="block w-full py-2.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
          >
            Back to Arcade
          </Link>
        </div>
      </div>
    </div>
  );
}
