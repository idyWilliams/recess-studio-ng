import type {
  GameDefinition,
  GamePlayer,
  GameValidationResult,
} from '@recess/game-core';

export interface DemoGameState {
  players: GamePlayer[];
  currentPlayerId: string;
  scores: Record<string, number>;
  turnCount: number;
  maxTurns: number;
}

export interface DemoGameMove {
  points: number;
}

export interface DemoGameResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

export const demoGame: GameDefinition<DemoGameState, DemoGameMove, DemoGameResult> = {
  id: 'take-turn-demo',
  name: 'Take Turn Demo',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(players: GamePlayer[]): DemoGameState {
    if (players.length !== 2) {
      throw new Error('Take Turn Demo requires exactly 2 players');
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
      maxTurns: 4,
    };
  },

  validateMove(
    state: DemoGameState,
    move: DemoGameMove,
    playerId: string,
  ): GameValidationResult {
    if (this.isGameOver(state)) {
      return {
        ok: false,
        reason: 'GAME_OVER',
        message: 'Game is already completed',
      };
    }
    if (state.currentPlayerId !== playerId) {
      return {
        ok: false,
        reason: 'NOT_YOUR_TURN',
        message: 'It is not your turn',
      };
    }
    if (
      !move ||
      typeof move.points !== 'number' ||
      !Number.isInteger(move.points) ||
      move.points < 1 ||
      move.points > 3
    ) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Move points must be an integer between 1 and 3',
      };
    }
    return { ok: true };
  },

  applyMove(state: DemoGameState, move: DemoGameMove, playerId: string): DemoGameState {
    const val = this.validateMove(state, move, playerId);
    if (!val.ok) {
      throw new Error(val.message);
    }
    const currentScore = state.scores[playerId] ?? 0;
    const nextScores = {
      ...state.scores,
      [playerId]: currentScore + move.points,
    };
    const nextTurn = state.turnCount + 1;
    const otherPlayer = state.players.find((p) => p.id !== playerId);
    const nextPlayerId =
      nextTurn >= state.maxTurns
        ? state.currentPlayerId
        : (otherPlayer?.id ?? state.currentPlayerId);

    return {
      ...state,
      scores: nextScores,
      turnCount: nextTurn,
      currentPlayerId: nextPlayerId,
    };
  },

  getNextPlayer(state: DemoGameState): string | null {
    if (this.isGameOver(state)) {
      return null;
    }
    return state.currentPlayerId;
  },

  isGameOver(state: DemoGameState): boolean {
    return state.turnCount >= state.maxTurns;
  },

  getResult(state: DemoGameState): DemoGameResult {
    const [p1, p2] = state.players;
    const s1 = (p1 && state.scores[p1.id]) ?? 0;
    const s2 = (p2 && state.scores[p2.id]) ?? 0;
    let winnerId: string | null = null;
    if (s1 > s2 && p1) {
      winnerId = p1.id;
    } else if (s2 > s1 && p2) {
      winnerId = p2.id;
    }
    return {
      winnerId,
      scores: { ...state.scores },
    };
  },
};
