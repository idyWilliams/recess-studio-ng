import type { GamePlayer } from '@recess/game-core';

export type MancalaVariant = 'kalah-6' | 'ayoayo-oware';

/** Standard Kalah-6 board configuration constants */
export const MANCALA_TOTAL_PITS = 14;
export const MANCALA_DEFAULT_SEEDS = 4;

export const P1_PITS = [0, 1, 2, 3, 4, 5] as const;
export const P1_STORE = 6;
export const P2_PITS = [7, 8, 9, 10, 11, 12] as const;
export const P2_STORE = 13;

export interface MancalaPitMove {
  type?: 'pit' | 'sow' | undefined;
  /** Pit index to sow seeds from (0–5 for Player 1, 7–12 for Player 2). */
  pitIndex: number;
}

export interface MancalaTimeoutMove {
  type: 'timeout';
}

export type MancalaMove = MancalaPitMove | MancalaTimeoutMove;

export interface MancalaTurnHistory {
  playerId: string;
  pitIndex?: number | undefined;
  seedsSown?: number | undefined;
  lastPit?: number | undefined;
  capturedSeeds?: number | undefined;
  grantedExtraTurn?: boolean | undefined;
  isTimeout?: boolean | undefined;
}

export interface MancalaState {
  players: GamePlayer[];
  currentPlayerId: string;
  scores: Record<string, number>;
  /**
   * Pits 0–5: Player 1's small pits
   * Pit 6: Player 1's store (Kalah)
   * Pits 7–12: Player 2's small pits
   * Pit 13: Player 2's store (Kalah)
   */
  pits: number[];
  variant: MancalaVariant;
  turnCount: number;
  history: MancalaTurnHistory[];
  lastSowPath?: number[] | undefined;
  isGameOver?: boolean | undefined;
  viewerSide?: ProjectedMancalaSide | undefined;
  opponentSide?: ProjectedMancalaSide | undefined;
  isViewerTurn?: boolean | undefined;
}

export interface MancalaResult {
  winnerId: string | null;
  scores: Record<string, number>;
  isDraw: boolean;
  isTimeout?: boolean | undefined;
  rematchPublicId?: string | null | undefined;
}

export interface ProjectedMancalaSide {
  pits: number[];
  store: number;
}

export interface ProjectedMancalaView extends MancalaState {
  viewerSide: ProjectedMancalaSide;
  opponentSide: ProjectedMancalaSide;
  isViewerTurn: boolean;
}
