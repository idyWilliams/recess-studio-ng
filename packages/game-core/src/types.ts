export interface GamePlayer {
  /** Platform user id — not an external provider identifier. */
  id: string;
  displayName: string;
}

export type GameValidationFailureReason =
  'INVALID_MOVE' | 'NOT_YOUR_TURN' | 'GAME_OVER';

export interface GameValidationSuccess {
  ok: true;
}

export interface GameValidationFailure {
  ok: false;
  reason: GameValidationFailureReason;
  message: string;
}

export type GameValidationResult = GameValidationSuccess | GameValidationFailure;

/**
 * Pluggable game contract: deterministic, infrastructure-free rules.
 * Implementations live in `games/*` packages or first-party game modules.
 */
export interface GameDefinition<TState = unknown, TMove = unknown, TResult = unknown> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(players: GamePlayer[]): TState;

  validateMove(state: TState, move: TMove, playerId: string): GameValidationResult;

  applyMove(state: TState, move: TMove, playerId: string): TState;

  getNextPlayer(state: TState): string | null;

  isGameOver(state: TState): boolean;

  getResult(state: TState): TResult;
}
