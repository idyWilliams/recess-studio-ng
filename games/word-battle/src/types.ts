import type { GamePlayer } from '@recess/game-core';

export interface BoardCoordinate {
  /** Row index: 0 (top) to 3 (bottom). */
  row: number;
  /** Column index: 0 (left) to 3 (right). */
  col: number;
}

export interface BoardTile {
  /** Stable unique tile identifier (e.g. 't_r0_c1_v0') preserved as tile cascades. */
  id: string;
  /** Uppercase letter 'A'..'Z'. */
  letter: string;
  /** Current row index on the board (0..3). */
  row: number;
  /** Current column index on the board (0..3). */
  col: number;
}

export interface CascadedTileMovement {
  tileId: string;
  fromRow: number;
  toRow: number;
  col: number;
}

export interface BoardTransitionDelta {
  /** IDs of tiles removed by the accepted word. */
  consumedTileIds: string[];
  /** Existing tiles that fell downward within their columns. */
  cascadedTiles: CascadedTileMovement[];
  /** Newly spawned tiles dropped into the top of columns. */
  spawnedTiles: BoardTile[];
  /** Whether an automatic dead-board reshuffle was triggered. */
  reshuffled?: boolean | undefined;
}

export type WordBattlePenaltyReason =
  | 'TOO_SHORT'
  | 'ILLEGAL_PATH'
  | 'DUPLICATE_WORD'
  | 'INVALID_DICTIONARY'
  | 'TIMEOUT';

export interface WordBattleTurnHistory {
  playerId: string;
  word: string;
  score: number;
  path?: BoardCoordinate[] | undefined;
  penalty?: WordBattlePenaltyReason | null | undefined;
}

/**
 * Word Battle — dynamic, server-authoritative casual word duel.
 *
 * - 2 players alternate turns on a shared 4×4 board.
 * - 3 lives per player; 10 total turns maximum (5 per player).
 * - Accepted words consume tiles; remaining tiles fall within columns; new tiles spawn.
 * - Rule violations (duplicate words, illegal paths, words < 3 letters, dictionary rejection, timeout)
 *   cost 1 life and end the turn.
 * - Match ends on knockout (0 lives) or 10 turns.
 */
export interface WordBattleState {
  /** All players in seat order (exactly 2 players). */
  players: GamePlayer[];
  /** User id of the player whose turn it is. */
  currentPlayerId: string;
  /** Accumulated scores keyed by user id. */
  scores: Record<string, number>;
  /** Remaining lives keyed by user id (starts at 3). */
  lives: Record<string, number>;
  /** Number of turns completed (each player's individual turn = 1). */
  turnCount: number;
  /** Total number of turns after which the game ends (10 turns = 5 rounds × 2 players). */
  totalTurns: number;
  /** Authoritative 4×4 board grid [row][col]. */
  board: BoardTile[][];
  /** Monotonic board version counter incremented on every cascade/refill. */
  boardVersion: number;
  /** Match-wide lowercase list of all successfully accepted words. */
  usedWords: string[];
  /** Turn-by-turn history. */
  history: WordBattleTurnHistory[];
  /** Last board transition delta for client animation and reconnect reconciliation. */
  lastTransition?: BoardTransitionDelta | undefined;
  /** Seed used for deterministic PRNG (stripped from client-projected state views for fog-of-war security). */
  rngSeed?: number | undefined;
  /** Current step counter in the deterministic PRNG sequence. */
  rngStep: number;
}

export interface WordBattleWordMove {
  type?: 'word' | undefined;
  /** The word the current player is submitting. */
  word: string;
  /** Path of connected tile coordinates forming the word. */
  path?: BoardCoordinate[] | undefined;
  /**
   * Whether the word was recognized by the approved dictionary.
   * Defaults to true if omitted. The API sets false if the dictionary confirmed invalid.
   */
  isDictionaryValid?: boolean | undefined;
}

export interface WordBattleTimeoutMove {
  type: 'timeout';
}

export type WordBattleMove = WordBattleWordMove | WordBattleTimeoutMove;

export interface WordBattleResult {
  /** User id of the winner, or null if the game is a draw. */
  winnerId: string | null;
  /** Final scores keyed by user id. */
  scores: Record<string, number>;
  /** Final lives keyed by user id. */
  lives: Record<string, number>;
  /** Whether the game ended as a draw. */
  isDraw: boolean;
  /** Whether the game ended via knockout (opponent losing all lives). */
  isKnockout: boolean;
  /** Public id of the 1-tap rematch session if one has been provisioned. */
  rematchPublicId?: string | null | undefined;
}
