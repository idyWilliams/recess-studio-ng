import type { GamePlayer } from '@recess/game-core';

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export const LUDO_COLORS: readonly LudoColor[] = ['red', 'green', 'yellow', 'blue'] as const;

export const TOTAL_TRACK_SQUARES = 52;
export const HOME_STRETCH_LENGTH = 5;
export const HOME_STEP = 56; // 0 = start, 50 = last track, 51-55 = home stretch, 56 = home

/** Track entry offsets on the 52-square loop */
export const START_OFFSETS: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/**
 * Standard safe squares where tokens cannot be captured:
 * Starting squares (0, 13, 26, 39) plus standard star safety spots (8, 21, 34, 47).
 */
export const SAFE_SQUARES: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

export interface LudoToken {
  id: string; // e.g. 'red-0', 'yellow-3'
  color: LudoColor;
  index: number; // 0..3
  step: number; // -1 = yard, 0..50 = track, 51..55 = stretch, 56 = home
  isHome: boolean;
}

export type LudoTurnPhase = 'roll' | 'move';

export interface LudoRollMove {
  type: 'roll';
}

export interface LudoTokenMove {
  type?: 'move' | undefined;
  tokenId?: string | undefined;
  tokenIndex?: number | undefined;
}

export interface LudoTimeoutMove {
  type: 'timeout';
}

export type LudoMove = LudoRollMove | LudoTokenMove | LudoTimeoutMove;

export interface LudoTurnHistory {
  playerId: string;
  color: LudoColor;
  moveType: 'roll' | 'move' | 'timeout';
  diceRoll?: number | undefined;
  tokenId?: string | undefined;
  fromStep?: number | undefined;
  toStep?: number | undefined;
  capturedTokenId?: string | undefined;
  isExtraTurn?: boolean | undefined;
  timestampMs?: number | undefined;
}

export interface LudoState {
  players: GamePlayer[];
  playerColors: Record<string, LudoColor>;
  colorPlayers: Record<LudoColor, string>;
  tokens: Record<LudoColor, LudoToken[]>;
  currentPlayerId: string;
  currentColor: LudoColor;
  turnPhase: LudoTurnPhase;
  diceRoll: number | null;
  consecutiveSixes: number;
  turnCount: number;
  history: LudoTurnHistory[];
  isGameOver?: boolean | undefined;
  winnerColor?: LudoColor | null | undefined;
  rngSeed?: number | undefined;
  rngStep?: number | undefined;
}

export interface LudoResult {
  winnerId: string | null;
  winnerColor: LudoColor | null;
  tokensHome: Record<string, number>;
  isDraw: boolean;
  isTimeout?: boolean | undefined;
}

export interface ProjectedLudoToken extends LudoToken {
  trackSquare: number | null; // 0..51 if on main track, null if in yard or home
  isSafe: boolean;
}

export interface ProjectedLudoState {
  players: GamePlayer[];
  playerColors: Record<string, LudoColor>;
  tokens: Record<LudoColor, ProjectedLudoToken[]>;
  currentPlayerId: string;
  currentColor: LudoColor;
  turnPhase: LudoTurnPhase;
  diceRoll: number | null;
  legalTokenMoves: string[]; // Token IDs that the active player can legally click
  turnCount: number;
  history: LudoTurnHistory[];
  isGameOver?: boolean | undefined;
  winnerColor?: LudoColor | null | undefined;
  isViewerTurn?: boolean | undefined;
}
