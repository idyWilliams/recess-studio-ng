import type {
  GameDefinition,
  GamePlayer,
  GameValidationResult,
} from '@recess/game-core';

import type { WordBattleMove, WordBattleResult, WordBattleState } from './types.js';

/** Default number of rounds (each player gets one turn per round). */
const DEFAULT_MAX_ROUNDS = 5;

export const wordBattleGame: GameDefinition<
  WordBattleState,
  WordBattleMove,
  WordBattleResult
> = {
  id: 'word-battle',
  name: 'Word Battle',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(players: GamePlayer[]): WordBattleState {
    if (players.length !== 2) {
      throw new Error('Word Battle requires exactly 2 players');
    }
    const [p1, p2] = players;
    if (!p1 || !p2) {
      throw new Error('Invalid players');
    }
    return {
      players,
      currentPlayerId: p1.id,
      scores: { [p1.id]: 0, [p2.id]: 0 },
      turnCount: 0,
      totalTurns: DEFAULT_MAX_ROUNDS * players.length,
      history: [],
    };
  },

  validateMove(
    state: WordBattleState,
    move: WordBattleMove,
    playerId: string,
  ): GameValidationResult {
    if (this.isGameOver(state)) {
      return {
        ok: false,
        reason: 'GAME_OVER',
        message: 'The game is already over',
      };
    }

    if (state.currentPlayerId !== playerId) {
      return {
        ok: false,
        reason: 'NOT_YOUR_TURN',
        message: 'It is not your turn',
      };
    }

    if (!move || typeof move.word !== 'string' || move.word.trim().length === 0) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Word must be a non-empty string',
      };
    }

    // Normalize: must contain only alphabetic characters (a-z, A-Z)
    const normalized = move.word.trim().toLowerCase();
    if (!/^[a-z]+$/.test(normalized)) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Word must contain only alphabetic characters',
      };
    }

    // Dictionary validity is enforced at the API service layer before reaching here.
    // The game core does not perform I/O; it trusts that the API has pre-validated
    // the word against an external dictionary.
    return { ok: true };
  },

  applyMove(
    state: WordBattleState,
    move: WordBattleMove,
    playerId: string,
  ): WordBattleState {
    const validation = this.validateMove(state, move, playerId);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const normalized = move.word.trim().toLowerCase();
    const wordScore = normalized.length; // 1 point per character

    const nextScores = {
      ...state.scores,
      [playerId]: (state.scores[playerId] ?? 0) + wordScore,
    };

    const nextTurnCount = state.turnCount + 1;
    const isLastTurn = nextTurnCount >= state.totalTurns;

    // Alternate players unless the game is now over
    const otherPlayer = state.players.find((p) => p.id !== playerId);
    const nextPlayerId = isLastTurn
      ? state.currentPlayerId // game over — value does not matter but must be stable
      : (otherPlayer?.id ?? state.currentPlayerId);

    return {
      ...state,
      scores: nextScores,
      currentPlayerId: nextPlayerId,
      turnCount: nextTurnCount,
      history: [...state.history, { playerId, word: normalized, score: wordScore }],
    };
  },

  getNextPlayer(state: WordBattleState): string | null {
    if (this.isGameOver(state)) {
      return null;
    }
    return state.currentPlayerId;
  },

  isGameOver(state: WordBattleState): boolean {
    return state.turnCount >= state.totalTurns;
  },

  getResult(state: WordBattleState): WordBattleResult {
    const [p1, p2] = state.players;
    if (!p1 || !p2) {
      throw new Error('Invalid players');
    }
    const s1 = state.scores[p1.id] ?? 0;
    const s2 = state.scores[p2.id] ?? 0;

    let winnerId: string | null = null;
    let isDraw = false;

    if (s1 > s2) {
      winnerId = p1.id;
    } else if (s2 > s1) {
      winnerId = p2.id;
    } else {
      isDraw = true;
    }

    return {
      winnerId,
      scores: { ...state.scores },
      isDraw,
    };
  },
};
