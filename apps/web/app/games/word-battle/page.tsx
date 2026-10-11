'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, PvPMatchup, TurnIndicator } from '@recess/ui';

// 4x4 letter board grid representing the shared arena
const BOARD_LETTERS = [
  ['R', 'E', 'C', 'E'],
  ['S', 'T', 'U', 'D'],
  ['I', 'O', 'G', 'A'],
  ['M', 'E', 'S', 'N'],
];

const LETTER_SCORES: Record<string, number> = {
  A: 1, E: 1, I: 1, O: 1, N: 1, R: 1, S: 1, T: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
  U: 1,
};

export default function WordBattleArenaPage() {
  const [word, setWord] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; type: 'valid' | 'invalid' | 'info' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [history, setHistory] = useState([
    { player: 'Chidi', word: 'RECES', score: 5 },
    { player: 'Tunde', word: 'STUDIO', score: 6 },
    { player: 'Chidi', word: 'GAMES', score: 5 },
    { player: 'Tunde', word: 'COIN', score: 4 },
  ]);

  const handleTileClick = (rowIndex: number, colIndex: number, letter: string) => {
    const tileIndex = rowIndex * 4 + colIndex;
    
    // If clicking the last selected tile, deselect it (undo)
    if (selectedIndices.length > 0 && selectedIndices[selectedIndices.length - 1] === tileIndex) {
      setSelectedIndices(selectedIndices.slice(0, -1));
      setWord(word.slice(0, -1));
      return;
    }

    // Append tile to path
    setSelectedIndices([...selectedIndices, tileIndex]);
    setWord((prev) => prev + letter);
    setFeedback(null);
  };

  const handleClear = () => {
    setSelectedIndices([]);
    setWord('');
    setFeedback(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = word.trim().toUpperCase();

    if (trimmed.length < 2) {
      setFeedback({
        message: 'Word must be at least 2 letters!',
        type: 'invalid',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback({
      message: `"${trimmed}" validated! +${trimmed.length} points!`,
      type: 'valid',
    });

    // Add to history
    setHistory((prev) => [{ player: 'Chidi', word: trimmed, score: trimmed.length }, ...prev]);
    
    // Reset path after short delay
    setTimeout(() => {
      setWord('');
      setSelectedIndices([]);
      setIsSubmitting(false);
    }, 900);
  };

  return (
    <div
      className="flex min-h-dvh flex-col bg-recess-navy text-white bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/assets/games/word-battle/backgrounds/word-battle-bg-midnight.svg')",
      }}
    >
      {/* Top Arena Header */}
      <header className="border-b border-recess-navy-border/80 bg-recess-navy/85 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            href="/games"
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
          >
            <span>&larr;</span>
            <span>Leave Arena</span>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-recess-purple/30 bg-recess-purple/10 px-3 py-1 text-xs font-bold text-recess-purple-light shadow-glow-purple">
            <img
              src="/assets/games/word-battle/icons/word-battle-sword.svg"
              alt="Duel"
              className="h-3.5 w-3.5"
            />
            <span>Word Battle Arena</span>
          </div>

          <TurnIndicator status="your_turn" />
        </div>
      </header>

      {/* Main Arena Area */}
      <main className="mx-auto flex flex-1 w-full max-w-lg flex-col justify-between px-4 py-4 space-y-4">
        {/* Matchup Header with custom avatars and live health HUD */}
        <div className="space-y-2">
          <PvPMatchup
            isDark
            roundInfo="Round 3 of 5 • Async Knockout Duel"
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

          {/* Player Lives Bar */}
          <div className="flex items-center justify-between rounded-xl border border-recess-navy-border/60 bg-recess-navy-card/80 px-3 py-1.5 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Chidi Lives:</span>
              <div className="flex items-center gap-1">
                <img
                  src="/assets/games/word-battle/icons/word-battle-life-active.svg"
                  alt="Life active"
                  className="h-3.5 w-3.5 drop-shadow-sm"
                />
                <img
                  src="/assets/games/word-battle/icons/word-battle-life-active.svg"
                  alt="Life active"
                  className="h-3.5 w-3.5 drop-shadow-sm"
                />
                <img
                  src="/assets/games/word-battle/icons/word-battle-life-active.svg"
                  alt="Life active"
                  className="h-3.5 w-3.5 drop-shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-recess-gold">
              <img
                src="/assets/games/word-battle/icons/word-battle-turn-jewel.svg"
                alt="Turn"
                className="h-3 w-3 animate-pulse"
              />
              <span className="text-[10px] uppercase tracking-wider">Turn 6</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Tunde Lives:</span>
              <div className="flex items-center gap-1">
                <img
                  src="/assets/games/word-battle/icons/word-battle-life-active.svg"
                  alt="Life active"
                  className="h-3.5 w-3.5 drop-shadow-sm"
                />
                <img
                  src="/assets/games/word-battle/icons/word-battle-life-active.svg"
                  alt="Life active"
                  className="h-3.5 w-3.5 drop-shadow-sm"
                />
                <img
                  src="/assets/games/word-battle/icons/word-battle-life-lost.svg"
                  alt="Life lost"
                  className="h-3.5 w-3.5 opacity-60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4x4 Tactile Letter Board */}
        <section
          aria-label="Word Battle Board"
          className="relative mx-auto w-full max-w-sm rounded-3xl p-3 shadow-2xl border border-recess-navy-border"
          style={{
            backgroundImage: "url('/assets/games/word-battle/boards/word-battle-board-frame.svg')",
            backgroundSize: '100% 100%',
          }}
        >
          <div
            className="grid grid-cols-4 gap-2.5 p-2 rounded-2xl"
            style={{
              backgroundImage: "url('/assets/games/word-battle/boards/word-battle-board-pattern.svg')",
              backgroundRepeat: 'repeat',
            }}
          >
            {BOARD_LETTERS.map((row, rIdx) =>
              row.map((letter, cIdx) => {
                const tileIndex = rIdx * 4 + cIdx;
                const isSelected = selectedIndices.includes(tileIndex);
                const orderNumber = isSelected ? selectedIndices.indexOf(tileIndex) + 1 : null;
                const letterScore = LETTER_SCORES[letter] ?? 1;

                // Determine tile background graphic state
                let tileBg = '/assets/games/word-battle/tiles/word-battle-tile-default.svg';
                if (isSelected) {
                  tileBg =
                    feedback?.type === 'valid'
                      ? '/assets/games/word-battle/tiles/word-battle-tile-valid.svg'
                      : feedback?.type === 'invalid'
                      ? '/assets/games/word-battle/tiles/word-battle-tile-invalid.svg'
                      : '/assets/games/word-battle/tiles/word-battle-tile-selected.svg';
                }

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    type="button"
                    onClick={() => handleTileClick(rIdx, cIdx, letter)}
                    className={`relative flex aspect-square items-center justify-center rounded-xl transition-all duration-150 select-none active:scale-95 ${
                      isSelected
                        ? 'scale-105 shadow-glow-purple ring-2 ring-recess-purple'
                        : 'hover:scale-102 hover:brightness-110'
                    }`}
                    style={{
                      backgroundImage: `url('${tileBg}')`,
                      backgroundSize: '100% 100%',
                    }}
                    aria-label={`Letter ${letter}, ${letterScore} points`}
                  >
                    {/* Order Badge on active selection path */}
                    {orderNumber !== null && (
                      <span className="absolute top-1 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-recess-purple text-[9px] font-black text-white shadow">
                        {orderNumber}
                      </span>
                    )}

                    {/* Letter Character */}
                    <span className="font-mono text-2xl font-black text-white drop-shadow-md sm:text-3xl">
                      {letter}
                    </span>

                    {/* Tile Point Value */}
                    <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-neutral-400">
                      {letterScore}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Current Assembled Word & Actions */}
        <div className="space-y-2">
          <div className="relative flex items-center justify-between rounded-2xl border border-recess-navy-border bg-recess-navy-card/90 px-4 py-3 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Word:
              </span>
              <span className="font-mono text-xl font-black tracking-widest text-white sm:text-2xl">
                {word || <span className="text-neutral-500 font-normal text-sm">TAP TILES TO BUILD...</span>}
              </span>
            </div>

            {word.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-recess-purple/20 px-2 py-0.5 text-xs font-bold text-recess-purple-light">
                  {word.length} pts
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-neutral-300 hover:bg-white/20 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Feedback & Effects Banner */}
          {feedback && (
            <div
              className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-center text-xs font-bold animate-fade-in ${
                feedback.type === 'valid'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : feedback.type === 'invalid'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-recess-purple/20 text-recess-purple-light'
              }`}
            >
              {feedback.type === 'valid' && (
                <img
                  src="/assets/games/word-battle/effects/word-battle-sparkle.svg"
                  alt="Sparkle"
                  className="h-4 w-4 animate-spin"
                />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              fullWidth
              size="lg"
              disabled={word.trim().length === 0 || isSubmitting}
              onClick={() => handleSubmit()}
            >
              Submit Word ({word.trim().length} pts)
            </Button>
          </div>
        </div>

        {/* Word History Playfield */}
        <div className="rounded-2xl border border-recess-navy-border bg-recess-navy-card/70 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-recess-navy-border/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/games/word-battle/icons/word-battle-turn-jewel.svg"
                alt="History"
                className="h-3 w-3"
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Word History
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">Total: 45 pts</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-recess-navy/90 px-2.5 py-1.5 text-xs border border-recess-navy-border/40"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`text-[11px] font-bold ${
                      entry.player === 'Chidi'
                        ? 'text-recess-purple-light'
                        : 'text-amber-400'
                    }`}
                  >
                    {entry.player[0]}:
                  </span>
                  <span className="font-mono font-bold tracking-wider text-white truncate">
                    {entry.word}
                  </span>
                </div>
                <span className="rounded bg-white/10 px-1 py-0.2 text-[10px] font-bold text-recess-green">
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
