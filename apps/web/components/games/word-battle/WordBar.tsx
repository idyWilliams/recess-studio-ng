'use client';

interface WordBarProps {
  word: string;
  onClear: () => void;
}

export function WordBar({ word, onClear }: WordBarProps) {
  return (
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
            onClick={onClear}
            className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
