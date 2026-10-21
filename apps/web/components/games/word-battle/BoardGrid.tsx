'use client';

import type { BoardTile } from '@recess/game-word-battle';

import { LetterTile } from './LetterTile';

/**
 * Display-only per-letter pips preserved from the approved design. The spec keeps these
 * decorative ("awaiting approval") — they never feed scoring, which is 1 point per
 * letter and decided by the server.
 */
const LETTER_SCORES: Record<string, number> = {
  A: 1, E: 1, I: 1, N: 1, O: 1, R: 1, S: 1, T: 1, U: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
};

interface BoardGridProps {
  /** Server-authoritative board grid [row][col] rendered exactly as confirmed. */
  tiles: BoardTile[][];
  /** Selected tile ids in selection order. */
  selectedTileIds: string[];
  /** Server-confirmed outcome flash for the tiles involved in the last submission. */
  flash: 'valid' | 'invalid' | null;
  /** Tile IDs involved in the opponent's last move path for visual replay highlighting. */
  opponentTileIds?: string[] | undefined;
  onTileClick: (tile: BoardTile) => void;
}

export function BoardGrid({
  tiles,
  selectedTileIds,
  flash,
  opponentTileIds,
  onTileClick,
}: BoardGridProps) {
  return (
    <section
      aria-label="Word Battle Board"
      className="mx-auto w-full max-w-xs sm:max-w-sm select-none touch-none overscroll-contain"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'contain',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Board frame */}
      <div
        className="rounded-2xl p-[3px] select-none touch-none overscroll-contain"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'contain',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          background:
            'linear-gradient(145deg, rgba(108,56,255,0.55) 0%, rgba(27,118,255,0.35) 50%, rgba(108,56,255,0.25) 100%)',
          boxShadow:
            '0 0 40px rgba(108,56,255,0.35), 0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="rounded-[14px] p-3 select-none touch-none overscroll-contain"
          style={{
            touchAction: 'none',
            overscrollBehavior: 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            background:
              'linear-gradient(160deg, #161D2F 0%, #0D111C 60%, #111828 100%)',
          }}
        >
          <div
            className="grid grid-cols-4 gap-2 select-none touch-none overscroll-contain"
            style={{
              touchAction: 'none',
              overscrollBehavior: 'contain',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {tiles.flatMap((row) =>
              row.map((tile) => {
                const isSelected = selectedTileIds.includes(tile.id);
                const orderNumber = isSelected
                  ? selectedTileIds.indexOf(tile.id) + 1
                  : null;
                const letterScore = LETTER_SCORES[tile.letter] ?? 1;

                return (
                  <LetterTile
                    key={tile.id}
                    letter={tile.letter}
                    letterScore={letterScore}
                    isSelected={isSelected}
                    isValid={isSelected && flash === 'valid'}
                    isInvalid={isSelected && flash === 'invalid'}
                    isOpponentMove={!isSelected && (opponentTileIds?.includes(tile.id) ?? false)}
                    orderNumber={orderNumber}
                    onClick={() => onTileClick(tile)}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
