'use client';

import React from 'react';
import Link from 'next/link';

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
    ? 'Draw'
    : viewerWon
    ? 'Victory'
    : winnerName
    ? `${winnerName} Wins`
    : 'Match Concluded';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="alertdialog"
      aria-label="Match result"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#121214] p-6 text-center space-y-5 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16161A] border border-white/[0.06] text-[#C8B28A]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            {viewerWon ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15l-3.5 2 1-4-3-3 4-.5L12 6l1.5 3.5 4 .5-3 3 1 4z" />
            ) : isDraw ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8m-8 4h8m-8-8h8" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2" />
            )}
          </svg>
        </div>

        <div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#8E8E93]">
            {gameName}
          </span>
          <h2 className="text-xl font-medium tracking-tight text-[#F4F4F0] mt-1">{headline}</h2>
          {title && <p className="text-xs text-[#8E8E93] mt-1">{title}</p>}
        </div>

        {/* Score comparison card */}
        <div className="flex items-center justify-around p-4 rounded-xl bg-[#18181B] border border-white/[0.06]">
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-[#8E8E93]">@{playerOne.name}</span>
            <span className="text-xl font-medium tabular-nums text-[#F4F4F0] mt-0.5">{playerOne.score}</span>
            {winnerId === playerOne.id && (
              <span className="text-[10px] font-medium text-[#C8B28A] mt-1">Winner</span>
            )}
          </div>

          <span className="text-xs font-medium text-[#52525B]">VS</span>

          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-[#8E8E93]">@{playerTwo.name}</span>
            <span className="text-xl font-medium tabular-nums text-[#F4F4F0] mt-0.5">{playerTwo.score}</span>
            {winnerId === playerTwo.id && (
              <span className="text-[10px] font-medium text-[#C8B28A] mt-1">Winner</span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          {onShareWhatsApp && (
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="w-full py-3 rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] font-medium text-sm transition-colors"
            >
              Share Result to WhatsApp
            </button>
          )}

          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] text-[#E4E4E0] font-medium text-sm transition-colors"
            >
              Play Again
            </button>
          )}

          <Link
            href={homeHref}
            className="block w-full py-2 text-xs font-medium text-[#8E8E93] hover:text-[#F4F4F0] transition-colors"
          >
            Back to Lounge
          </Link>
        </div>
      </div>
    </div>
  );
}
