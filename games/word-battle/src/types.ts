import type { GamePlayer } from '@recess/game-core';

/**
 * Word Battle — score-accumulation word game.
 *
 * Scoring: each valid word scores its character length in points.
 * Turns alternate between two players.
 * Game ends when `maxRounds` full rounds (one turn per player per round)
 * have been completed.
 */
export interface WordBattleState {
  /** All players in seat order. */
  players: GamePlayer[];
  /** User id of the player whose turn it is. */
  currentPlayerId: string;
  /** Accumulated scores keyed by user id. */
  scores: Record<string, number>;
  /** Number of turns completed (each player's individual turn = 1). */
  turnCount: number;
  /**
   * Total number of turns after which the game ends.
   * Derived from maxRounds: totalTurns = maxRounds * players.length.
   */
  totalTurns: number;
  /** All words played so far (in order), for audit / display. */
  history: { playerId: string; word: string; score: number }[];
}

export interface WordBattleMove {
  /** The word the current player is submitting. Must be non-empty. */
  word: string;
}

export interface WordBattleResult {
  /** User id of the winner, or null if the game is a draw. */
  winnerId: string | null;
  /** Final scores keyed by user id. */
  scores: Record<string, number>;
  /** Whether the game ended as a draw. */
  isDraw: boolean;
}
