'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, PvPMatchup, TurnIndicator } from '@recess/ui';

// 4x4 shared letter board
const BOARD_LETTERS = [
  ['R', 'E', 'C', 'E'],
  ['S', 'T', 'U', 'D'],
  ['I', 'O', 'G', 'A'],
  ['M', 'E', 'S', 'N'],
];

const LETTER_SCORES: Record<string, number> = {
  A: 1, E: 1, I: 1, N: 1, O: 1, R: 1, S: 1, T: 1, U: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
};

export default function WordBattleArenaPage() {
  const [word, setWord] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: 'valid' | 'invalid' | 'info';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([
    { player: 'Chidi', word: 'RECES', score: 5 },
    { player: 'Tunde', word: 'STUDIO', score: 6 },
    { player: 'Chidi', word: 'GAMES', score: 5 },
    { player: 'Tunde', word: 'COIN', score: 4 },
  ]);

  const handleTileClick = (rowIndex: number, colIndex: number, letter: string) => {
    const tileIndex = rowIndex * 4 + colIndex;

    // Tap last tile again = undo
    if (
      selectedIndices.length > 0 &&
      selectedIndices[selectedIndices.length - 1] === tileIndex
    ) {
      setSelectedIndices(selectedIndices.slice(0, -1));
      setWord(word.slice(0, -1));
      return;
    }

    setSelectedIndices([...selectedIndices, tileIndex]);
    setWord((prev) => prev + letter);
    setFeedback(null);
  };

  const handleClear = () => {
    setSelectedIndices([]);
    setWord('');
    setFeedback(null);
  };

  const handleSubmit = () => {
    const trimmed = word.trim().toUpperCase();
    if (trimmed.length < 2) {
      setFeedback({ message: 'Word must be at least 2 letters!', type: 'invalid' });
      return;
    }
    setIsSubmitting(true);
    setFeedback({
      message: `"${trimmed}" submitted! +${trimmed.length} pts`,
      type: 'valid',
    });
    setHistory((prev) => [{ player: 'Chidi', word: trimmed, score: trimmed.length }, ...prev]);
    setTimeout(() => {
      setWord('');
      setSelectedIndices([]);
      setFeedback(null);
      setIsSubmitting(false);
    }, 1000);
  };

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
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto text-white"
      style={{
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

          <TurnIndicator status="your_turn" />
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-4">

        {/* PvP MATCHUP ───────────────────────────────────────────── */}
        <PvPMatchup
          isDark
          roundInfo="Round 3 of 5 · Knockout Duel"
          playerOne={{
            id: 'p1',
            username: 'Chidi',
            avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
            score: 24,
            presence: 'online',
            isCurrentTurn: true,
          }}
          playerTwo={{
            id: 'p2',
            username: 'Tunde',
            avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
            score: 21,
            presence: 'in_game',
          }}
        />

        {/* LIVES HUD ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <LivesRow label="Chidi" lives={3} total={3} />

          <div className="flex items-center gap-1.5 text-recess-gold text-[10px] font-bold uppercase tracking-wider">
            <span
              className="h-2 w-2 rounded-full bg-recess-green animate-pulse"
              aria-hidden="true"
            />
            Turn 6
          </div>

          <LivesRow label="Tunde" lives={2} total={3} reverse />
        </div>

        {/* LETTER BOARD ──────────────────────────────────────────── */}
        <section
          aria-label="Word Battle Board"
          className="mx-auto w-full max-w-xs sm:max-w-sm"
        >
          {/* Board frame */}
          <div
            className="rounded-2xl p-[3px]"
            style={{
              background:
                'linear-gradient(145deg, rgba(108,56,255,0.55) 0%, rgba(27,118,255,0.35) 50%, rgba(108,56,255,0.25) 100%)',
              boxShadow:
                '0 0 40px rgba(108,56,255,0.35), 0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="rounded-[14px] p-3"
              style={{
                background:
                  'linear-gradient(160deg, #161D2F 0%, #0D111C 60%, #111828 100%)',
              }}
            >
              <div className="grid grid-cols-4 gap-2">
                {BOARD_LETTERS.map((row, rIdx) =>
                  row.map((letter, cIdx) => {
                    const tileIndex = rIdx * 4 + cIdx;
                    const isSelected = selectedIndices.includes(tileIndex);
                    const orderNumber = isSelected
                      ? selectedIndices.indexOf(tileIndex) + 1
                      : null;
                    const letterScore = LETTER_SCORES[letter] ?? 1;
                    const isValid = isSelected && feedback?.type === 'valid';
                    const isInvalid = isSelected && feedback?.type === 'invalid';

                    return (
                      <LetterTile
                        key={`${rIdx}-${cIdx}`}
                        letter={letter}
                        letterScore={letterScore}
                        isSelected={isSelected}
                        isValid={isValid}
                        isInvalid={isInvalid}
                        orderNumber={orderNumber}
                        onClick={() => handleTileClick(rIdx, cIdx, letter)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        {/* WORD BAR ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 shrink-0">
              Word
            </span>
            {word ? (
              <span className="font-mono text-xl font-black tracking-[0.2em] text-white truncate">
                {word}
              </span>
            ) : (
              <span className="text-sm text-neutral-600 font-medium">
                tap tiles to build…
              </span>
            )}
          </div>

          {word.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span
                className="rounded-lg px-2 py-0.5 text-xs font-bold"
                style={{
                  background: 'rgba(108,56,255,0.25)',
                  color: '#C4A8FF',
                }}
              >
                {word.length} pts
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* FEEDBACK BANNER ───────────────────────────────────────── */}
        {feedback && (
          <div
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-xs font-bold animate-fade-in ${
              feedback.type === 'valid'
                ? 'text-emerald-300'
                : feedback.type === 'invalid'
                ? 'text-rose-300'
                : 'text-recess-purple-light'
            }`}
            style={{
              background:
                feedback.type === 'valid'
                  ? 'rgba(16,185,129,0.15)'
                  : feedback.type === 'invalid'
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(108,56,255,0.15)',
              border: `1px solid ${
                feedback.type === 'valid'
                  ? 'rgba(16,185,129,0.30)'
                  : feedback.type === 'invalid'
                  ? 'rgba(239,68,68,0.30)'
                  : 'rgba(108,56,255,0.30)'
              }`,
            }}
          >
            {feedback.type === 'valid' && (
              <img
                src="/assets/games/word-battle/effects/word-battle-sparkle.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
            )}
            {feedback.message}
          </div>
        )}

        {/* SUBMIT BUTTON ─────────────────────────────────────────── */}
        <Button
          type="button"
          variant="primary"
          fullWidth
          size="lg"
          disabled={word.trim().length < 2 || isSubmitting}
          onClick={handleSubmit}
        >
          Submit Word
          {word.trim().length >= 2 ? ` — ${word.trim().length} pts` : ''}
        </Button>

        {/* WORD HISTORY ──────────────────────────────────────────── */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.07]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Word History
            </span>
            <span className="text-[10px] text-neutral-600">
              {history.reduce((a, e) => a + e.score, 0)} pts combined
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`shrink-0 text-[10px] font-bold ${
                      entry.player === 'Chidi' ? 'text-[#C4A8FF]' : 'text-amber-400'
                    }`}
                  >
                    {entry.player[0]}:
                  </span>
                  <span className="font-mono font-bold tracking-wider text-white truncate">
                    {entry.word}
                  </span>
                </div>
                <span className="ml-1 shrink-0 text-[10px] font-bold text-emerald-400">
                  +{entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface LivesRowProps {
  label: string;
  lives: number;
  total: number;
  reverse?: boolean;
}

function LivesRow({ label, lives, total, reverse = false }: LivesRowProps) {
  return (
    <div className={`flex items-center gap-1.5 ${reverse ? 'flex-row-reverse' : ''}`}>
      <span className="text-neutral-500">{label}:</span>
      <div className={`flex items-center gap-0.5 ${reverse ? 'flex-row-reverse' : ''}`}>
        {Array.from({ length: total }).map((_, i) => (
          <Heart key={i} active={i < lives} />
        ))}
      </div>
    </div>
  );
}

function Heart({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M8 14s-6-3.9-6-8.5C2 3 3.5 2 5 2c1 0 2.1.6 3 1.6C8.9 2.6 10 2 11 2c1.5 0 3 1 3 3.5C14 10.1 8 14 8 14z"
        fill={active ? '#EF4444' : 'rgba(255,255,255,0.12)'}
        stroke={active ? '#FF6B6B' : 'rgba(255,255,255,0.15)'}
        strokeWidth="0.5"
        style={active ? { filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' } : undefined}
      />
    </svg>
  );
}

interface LetterTileProps {
  letter: string;
  letterScore: number;
  isSelected: boolean;
  isValid: boolean;
  isInvalid: boolean;
  orderNumber: number | null;
  onClick: () => void;
}

function LetterTile({
  letter,
  letterScore,
  isSelected,
  isValid,
  isInvalid,
  orderNumber,
  onClick,
}: LetterTileProps) {
  let bg: string;
  let border: string;
  let glow: string;

  if (isValid) {
    bg = 'linear-gradient(160deg, #1a3d2f 0%, #0f2820 100%)';
    border = '1.5px solid rgba(16,185,129,0.6)';
    glow = '0 0 14px rgba(16,185,129,0.35), inset 0 1px 0 rgba(16,185,129,0.2)';
  } else if (isInvalid) {
    bg = 'linear-gradient(160deg, #3d1a1a 0%, #280f0f 100%)';
    border = '1.5px solid rgba(239,68,68,0.6)';
    glow = '0 0 14px rgba(239,68,68,0.30), inset 0 1px 0 rgba(239,68,68,0.2)';
  } else if (isSelected) {
    bg = 'linear-gradient(160deg, #2a1f4a 0%, #1a1235 100%)';
    border = '1.5px solid rgba(108,56,255,0.7)';
    glow = '0 0 16px rgba(108,56,255,0.40), inset 0 1px 0 rgba(108,56,255,0.25)';
  } else {
    bg = 'linear-gradient(160deg, #1e2740 0%, #141a2c 100%)';
    border = '1.5px solid rgba(255,255,255,0.08)';
    glow = '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex aspect-square w-full items-center justify-center rounded-xl transition-all duration-150 select-none active:scale-90 ${
        isSelected ? 'scale-105' : 'hover:brightness-125'
      }`}
      style={{
        background: bg,
        border,
        boxShadow: glow,
      }}
      aria-label={`Letter ${letter}, ${letterScore} point${letterScore !== 1 ? 's' : ''}`}
      aria-pressed={isSelected}
    >
      {/* Selection order badge */}
      {orderNumber !== null && (
        <span
          className="absolute top-0.5 left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-white"
          style={{ background: 'rgba(108,56,255,0.85)' }}
          aria-hidden="true"
        >
          {orderNumber}
        </span>
      )}

      {/* Top specular bevel */}
      <span
        className="pointer-events-none absolute inset-x-3 top-[3px] h-px rounded-full"
        aria-hidden="true"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      />

      {/* Letter */}
      <span
        className="font-mono text-2xl font-black leading-none sm:text-3xl"
        style={{
          color: isSelected ? (isValid ? '#6EE7B7' : isInvalid ? '#FCA5A5' : '#C4A8FF') : '#E8ECF8',
          textShadow: isSelected ? '0 0 12px currentColor' : '0 1px 4px rgba(0,0,0,0.6)',
        }}
      >
        {letter}
      </span>

      {/* Score pip */}
      <span
        className="absolute bottom-0.5 right-1 text-[9px] font-bold"
        aria-hidden="true"
        style={{ color: isSelected ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)' }}
      >
        {letterScore}
      </span>
    </button>
  );
}
