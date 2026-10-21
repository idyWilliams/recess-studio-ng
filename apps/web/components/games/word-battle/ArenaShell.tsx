'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { TurnIndicator, type MatchStatusState } from '@recess/ui';

interface ArenaShellProps {
  /** Header status chip; null while loading/errored (no match state to show yet). */
  status: MatchStatusState | null;
  opponentName?: string | undefined;
  onWhatsAppNudge?: (() => void) | undefined;
  onWhatsAppShare?: (() => void) | undefined;
  children: ReactNode;
}

/**
 * Fullscreen Word Battle surface: the approved dark arena background, decorative dot
 * grid, and the game header (Leave, title, live turn indicator, and WhatsApp actions).
 */
export function ArenaShell({
  status,
  opponentName,
  onWhatsAppNudge,
  onWhatsAppShare,
  children,
}: ArenaShellProps) {
  return (
    /*
     * `position:fixed; inset:0` escapes the root layout's pb-24 wrapper so
     * the background genuinely covers 100% of the viewport with no cream bleed.
     * `overflow-y:auto` preserves scroll when content is taller than the screen.
     *
     * Background is pure CSS — no SVG background-image files, which fail
     * cross-browser when the SVG element has width/height="100%" (browser
     * cannot infer intrinsic size → background-size:cover does nothing).
     */
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain text-white min-h-[100dvh] h-[100dvh]"
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        background: `
          radial-gradient(ellipse 70% 55% at 15% 10%, rgba(108,56,255,0.28) 0%, transparent 70%),
          radial-gradient(ellipse 60% 45% at 88% 18%, rgba(27,118,255,0.22) 0%, transparent 65%),
          radial-gradient(ellipse 80% 40% at 50% 105%, rgba(108,56,255,0.18) 0%, transparent 60%),
          #0A0E1A
        `,
      }}
    >
      {/* Subtle dot grid overlay — purely decorative, fixed behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header
        className="relative z-10 border-b border-white/10 backdrop-blur-md sticky top-0"
        style={{ background: 'rgba(10,14,26,0.82)' }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            href="/games"
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            <span aria-hidden>←</span>
            <span>Leave</span>
          </Link>

          <div className="flex items-center gap-2">
            <img
              src="/assets/games/word-battle/icons/word-battle-sword.svg"
              alt=""
              aria-hidden="true"
              className="h-3.5 w-3.5 opacity-80"
            />
            <span className="text-xs font-bold tracking-wide text-recess-purple-light">
              Word Battle
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onWhatsAppNudge ? (
              <button
                type="button"
                onClick={onWhatsAppNudge}
                title={`Nudge ${opponentName ?? 'opponent'} on WhatsApp`}
                className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-emerald-300 transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.4)',
                }}
              >
                <img
                  src="/assets/shared/icons/icon-whatsapp.svg"
                  alt=""
                  className="h-3.5 w-3.5"
                />
                <span className="hidden sm:inline">Nudge</span>
              </button>
            ) : onWhatsAppShare ? (
              <button
                type="button"
                onClick={onWhatsAppShare}
                title="Share match on WhatsApp"
                className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-emerald-300 transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.4)',
                }}
              >
                <img
                  src="/assets/shared/icons/icon-whatsapp.svg"
                  alt=""
                  className="h-3.5 w-3.5"
                />
                <span className="hidden sm:inline">Share</span>
              </button>
            ) : null}

            {status ? (
              <TurnIndicator status={status} opponentName={opponentName} />
            ) : (
              <span className="w-16" aria-hidden="true" />
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-4">
        {children}
      </main>
    </div>
  );
}
