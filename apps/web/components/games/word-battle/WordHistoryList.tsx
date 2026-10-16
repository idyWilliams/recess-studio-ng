'use client';

import { getPenaltyLabel, type HistoryEntryView } from '@/lib/word-battle-view';

interface WordHistoryListProps {
  entries: HistoryEntryView[];
}

export function WordHistoryList({ entries }: WordHistoryListProps) {
  const combinedScore = entries.reduce((total, entry) => total + entry.score, 0);

  return (
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
          {combinedScore} pts combined
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="py-2 text-center text-xs text-neutral-600">
          No words played yet — the duel starts now.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.key}
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`shrink-0 text-[10px] font-bold ${
                    entry.seat === 0 ? 'text-[#C4A8FF]' : 'text-amber-400'
                  }`}
                >
                  {entry.playerUsername[0]}:
                </span>
                <span className="font-mono font-bold tracking-wider text-white truncate">
                  {entry.word || '—'}
                </span>
              </div>
              {entry.penalty ? (
                <span
                  className="ml-1 shrink-0 rounded px-1 text-[10px] font-bold text-rose-300"
                  style={{ background: 'rgba(239,68,68,0.15)' }}
                  title={`${entry.penalty} — no points, one life lost`}
                >
                  {getPenaltyLabel(entry.penalty)}
                </span>
              ) : (
                <span className="ml-1 shrink-0 text-[10px] font-bold text-emerald-400">
                  +{entry.score}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
