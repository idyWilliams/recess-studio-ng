'use client';

interface LetterTileProps {
  letter: string;
  letterScore: number;
  isSelected: boolean;
  isValid: boolean;
  isInvalid: boolean;
  isOpponentMove?: boolean | undefined;
  orderNumber: number | null;
  onClick: () => void;
}

/**
 * A single board letter tile. `letterScore` is the display-only pip preserved from the
 * approved design (spec: per-letter pips are decorative and await approval) — actual
 * scoring is 1 point per letter, decided by the server.
 */
export function LetterTile({
  letter,
  letterScore,
  isSelected,
  isValid,
  isInvalid,
  isOpponentMove = false,
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
  } else if (isOpponentMove) {
    bg = 'linear-gradient(160deg, #382414 0%, #24160c 100%)';
    border = '1.5px solid rgba(245,158,11,0.75)';
    glow = '0 0 16px rgba(245,158,11,0.45), inset 0 1px 0 rgba(245,158,11,0.25)';
  } else {
    bg = 'linear-gradient(160deg, #1e2740 0%, #141a2c 100%)';
    border = '1.5px solid rgba(255,255,255,0.08)';
    glow = '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex aspect-square w-full items-center justify-center rounded-xl transition-all duration-150 select-none touch-none active:scale-90 ${
        isSelected ? 'scale-105' : isOpponentMove ? 'scale-[1.02] ring-1 ring-amber-400/50' : 'hover:brightness-125'
      }`}
      style={{
        background: bg,
        border,
        boxShadow: glow,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
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
          color: isSelected
            ? isValid
              ? '#6EE7B7'
              : isInvalid
                ? '#FCA5A5'
                : '#C4A8FF'
            : isOpponentMove
              ? '#FDE68A'
              : '#E8ECF8',
          textShadow: isSelected
            ? '0 0 12px currentColor'
            : isOpponentMove
              ? '0 0 10px rgba(245,158,11,0.6)'
              : '0 1px 4px rgba(0,0,0,0.6)',
        }}
      >
        {letter}
      </span>

      {/* Score pip */}
      <span
        className="absolute bottom-0.5 right-1 text-[9px] font-bold"
        aria-hidden="true"
        style={{
          color: isSelected
            ? 'rgba(255,255,255,0.55)'
            : 'rgba(255,255,255,0.28)',
        }}
      >
        {letterScore}
      </span>
    </button>
  );
}
