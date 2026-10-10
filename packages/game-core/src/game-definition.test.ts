import { describe, expect, it } from 'vitest';

import { type GameDefinition, type GamePlayer } from './types.js';

/** Minimal deterministic game used only to validate the core contract in tests. */
interface TakeTurnState {
  players: GamePlayer[];
  currentPlayerId: string;
  scores: Record<string, number>;
  turnCount: number;
  maxTurns: number;
}

interface TakeTurnMove {
  points: number;
}

interface TakeTurnResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

const takeTurnGame: GameDefinition<TakeTurnState, TakeTurnMove, TakeTurnResult> = {
  id: 'take-turn-demo',
  name: 'Take Turn Demo',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(players) {
    if (players.length !== 2) {
      throw new Error('Take Turn Demo requires exactly two players');
    }
    const first = players[0];
    const second = players[1];
    if (!first || !second) {
      throw new Error('Invalid players');
    }
    return {
      players,
      currentPlayerId: first.id,
      scores: { [first.id]: 0, [second.id]: 0 },
      turnCount: 0,
      maxTurns: 4,
    };
  },

  validateMove(state, move, playerId) {
    if (this.isGameOver(state)) {
      return { ok: false, reason: 'GAME_OVER', message: 'Game is already over' };
    }
    if (state.currentPlayerId !== playerId) {
      return { ok: false, reason: 'NOT_YOUR_TURN', message: 'Not your turn' };
    }
    if (move.points < 1 || move.points > 3) {
      return { ok: false, reason: 'INVALID_MOVE', message: 'Points must be 1–3' };
    }
    return { ok: true };
  },

  applyMove(state, move, playerId) {
    const validation = this.validateMove(state, move, playerId);
    if (!validation.ok) {
      throw new Error(validation.message);
    }
    const nextScores = {
      ...state.scores,
      [playerId]: (state.scores[playerId] ?? 0) + move.points,
    };
    const nextTurn = state.turnCount + 1;
    const otherPlayer = state.players.find((p) => p.id !== playerId);
    return {
      ...state,
      scores: nextScores,
      turnCount: nextTurn,
      currentPlayerId:
        nextTurn >= state.maxTurns
          ? state.currentPlayerId
          : (otherPlayer?.id ?? state.currentPlayerId),
    };
  },

  getNextPlayer(state) {
    if (this.isGameOver(state)) {
      return null;
    }
    return state.currentPlayerId;
  },

  isGameOver(state) {
    return state.turnCount >= state.maxTurns;
  },

  getResult(state) {
    const [a, b] = state.players;
    if (!a || !b) {
      throw new Error('Invalid players');
    }
    const scoreA = state.scores[a.id] ?? 0;
    const scoreB = state.scores[b.id] ?? 0;
    let winnerId: string | null = null;
    if (scoreA > scoreB) {
      winnerId = a.id;
    } else if (scoreB > scoreA) {
      winnerId = b.id;
    }
    return { winnerId, scores: { ...state.scores } };
  },
};

describe('GameDefinition contract', () => {
  const players: GamePlayer[] = [
    { id: 'p1', displayName: 'Alex' },
    { id: 'p2', displayName: 'Sam' },
  ];

  it('runs a deterministic two-player sequence', () => {
    let state = takeTurnGame.createInitialState(players);
    expect(takeTurnGame.getNextPlayer(state)).toBe('p1');

    state = takeTurnGame.applyMove(state, { points: 2 }, 'p1');
    expect(state.currentPlayerId).toBe('p2');

    state = takeTurnGame.applyMove(state, { points: 3 }, 'p2');
    state = takeTurnGame.applyMove(state, { points: 1 }, 'p1');
    state = takeTurnGame.applyMove(state, { points: 2 }, 'p2');

    expect(takeTurnGame.isGameOver(state)).toBe(true);
    const result = takeTurnGame.getResult(state);
    expect(result.winnerId).toBe('p2');
    expect(result.scores).toEqual({ p1: 3, p2: 5 });
  });

  it('rejects moves out of turn', () => {
    const state = takeTurnGame.createInitialState(players);
    const validation = takeTurnGame.validateMove(state, { points: 1 }, 'p2');
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.reason).toBe('NOT_YOUR_TURN');
    }
  });
});
