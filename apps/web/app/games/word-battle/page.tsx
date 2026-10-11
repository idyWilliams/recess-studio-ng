'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, PvPMatchup, TurnIndicator } from '@recess/ui';

export default function WordBattleArenaPage() {
  const [word, setWord] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const history = [
    { player: 'Chidi', word: 'KNIGHT', score: 6 },
    { player: 'Tunde', word: 'BLADE', score: 5 },
    { player: 'Chidi', word: 'CASTLE', score: 6 },
    { player: 'Tunde', word: 'DRAGON', score: 6 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim().toUpperCase();
    if (trimmed.length < 2) {
      setFeedback('Word must be at least 2 letters');
      return;
    }
    setFeedback(`"${trimmed}" submitted! Waiting for dictionary validation...`);
    setWord('');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-recess-navy text-white">
      {/* Top Arena Header */}
      <header className="border-b border-recess-navy-border bg-recess-navy/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            href="/games"
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
          >
            <span>&larr;</span>
            <span>Leave Arena</span>
          </Link>

          <span className="rounded-full bg-recess-purple-subtle px-2.5 py-0.5 text-xs font-bold text-recess-purple">
            Word Battle
          </span>

          <TurnIndicator status="your_turn" />
        </div>
      </header>

      {/* Main Arena Area */}
      <main className="mx-auto flex flex-1 w-full max-w-lg flex-col justify-between px-4 py-5 space-y-4">
        {/* Dark PvP Matchup Banner */}
        <PvPMatchup
          isDark
          roundInfo="Round 3 of 5 • Async Duel"
          playerOne={{
            id: 'p1',
            username: 'Chidi',
            score: 12,
            presence: 'online',
            isCurrentTurn: true,
          }}
          playerTwo={{
            id: 'p2',
            username: 'Tunde',
            score: 11,
            presence: 'in_game',
          }}
        />

        {/* Word History Playfield */}
        <div className="flex-1 rounded-2xl border border-recess-navy-border bg-recess-navy-card p-4 space-y-3 min-h-[220px]">
          <div className="flex items-center justify-between border-b border-recess-navy-border/60 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Played Words
            </span>
            <span className="text-[11px] text-neutral-400">Total Score: 23 pts</span>
          </div>

          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-recess-navy/80 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      entry.player === 'Chidi'
                        ? 'text-recess-purple-light'
                        : 'text-amber-400'
                    }`}
                  >
                    {entry.player}:
                  </span>
                  <span className="font-mono font-bold tracking-widest text-white">
                    {entry.word}
                  </span>
                </div>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-recess-green">
                  +{entry.score} pts
                </span>
              </div>
            ))}
          </div>

          {feedback && (
            <div className="mt-3 rounded-lg bg-recess-purple/20 p-2.5 text-center text-xs font-semibold text-recess-purple-light animate-fade-in">
              {feedback}
            </div>
          )}
        </div>

        {/* Word Input & Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z]/g, ''))}
              placeholder="ENTER YOUR WORD..."
              maxLength={15}
              className="w-full rounded-2xl border border-recess-navy-border bg-recess-navy-card px-4 py-3.5 text-center font-mono text-lg font-bold uppercase tracking-widest text-white placeholder-neutral-500 shadow-inner outline-none transition-all focus:border-recess-purple focus:ring-2 focus:ring-recess-purple/30"
            />
            {word.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                {word.length} pts
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            disabled={word.trim().length === 0}
          >
            Submit Word ({word.trim().length} pts)
          </Button>
        </form>
      </main>
    </div>
  );
}
