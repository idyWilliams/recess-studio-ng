import type { GamePlayer } from '@recess/game-core';

export type WhotSuit = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';
export type WhotDeclaredSuit = Exclude<WhotSuit, 'whot'>;

export interface WhotCard {
  id: string; // Unique card identifier e.g. 'circle-1', 'whot-20-3'
  suit: WhotSuit;
  number: number; // 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14, 20
}

export type WhotMoveType = 'play' | 'draw' | 'timeout';

export interface WhotPlayMove {
  type?: 'play' | undefined;
  cardId: string;
  declaredSuit?: WhotDeclaredSuit | undefined; // Mandatory when playing card 20
}

export interface WhotDrawMove {
  type: 'draw';
}

export interface WhotTimeoutMove {
  type: 'timeout';
}

export type WhotMove = WhotPlayMove | WhotDrawMove | WhotTimeoutMove;

export type WhotSpecialAction =
  | 'hold_on' // Card 1
  | 'pick_two' // Card 2
  | 'suspension' // Card 8
  | 'general_market' // Card 14
  | 'whot'; // Card 20

export interface WhotTurnHistory {
  playerId: string;
  moveType: WhotMoveType;
  card?: WhotCard | undefined;
  declaredSuit?: WhotDeclaredSuit | undefined;
  drawnCardsCount?: number | undefined;
  specialAction?: WhotSpecialAction | undefined;
  timestampMs?: number | undefined;
}

export interface WhotState {
  players: GamePlayer[];
  currentPlayerId: string;
  hands: Record<string, WhotCard[]>;
  stockPile: WhotCard[];
  discardPile: WhotCard[];
  activeSuit: WhotDeclaredSuit;
  activeNumber: number;
  pendingDrawCount: number;
  turnCount: number;
  history: WhotTurnHistory[];
  isGameOver?: boolean | undefined;
  rngSeed?: number | undefined;
  rngStep?: number | undefined;
}

export interface WhotResult {
  winnerId: string | null;
  scores: Record<string, number>;
  isDraw: boolean;
  isTimeout?: boolean | undefined;
}

export interface ProjectedWhotPlayer {
  id: string;
  displayName: string;
  cardCount: number;
  cards?: WhotCard[] | undefined; // Only revealed to the owner!
}

export interface ProjectedWhotState {
  players: ProjectedWhotPlayer[];
  currentPlayerId: string;
  topDiscard: WhotCard | null;
  activeSuit: WhotDeclaredSuit | null;
  activeNumber: number | null;
  stockCount: number;
  pendingDrawCount: number;
  turnCount: number;
  history: WhotTurnHistory[];
  isGameOver?: boolean | undefined;
  isViewerTurn?: boolean | undefined;
}

/**
 * Standard Naija Whot 54-card deck composition:
 * - Circles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14 (12 cards)
 * - Triangles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14 (12 cards)
 * - Crosses: 1, 2, 3, 5, 7, 10, 11, 13, 14 (9 cards)
 * - Squares: 1, 2, 3, 5, 7, 10, 11, 13, 14 (9 cards)
 * - Stars: 1, 2, 3, 4, 5, 7, 8 (7 cards)
 * - Whot: 20 (5 cards)
 * Total = 54 cards
 */
export const WHOT_DECK_SPEC: Record<WhotSuit, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
  whot: [20, 20, 20, 20, 20],
};

export const INITIAL_HAND_SIZE = 6;
