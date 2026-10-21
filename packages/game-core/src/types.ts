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

export interface GameMetadata {
  description?: string | undefined;
  category?: string | undefined;
  tags?: string[] | undefined;
  turnDurationMs?: number | undefined;
  [key: string]: unknown;
}

export interface GameInitContext {
  players: GamePlayer[];
  seed?: number | undefined;
  options?: Record<string, unknown> | undefined;
}

/**
 * Universal Game Cartridge contract: deterministic, server-authoritative rules engine.
 * Implementations live in `games/*` packages or first-party game modules.
 */
export interface GameCartridge<TState = unknown, TMove = unknown, TResult = unknown> {
  id: string;
  gameId?: string | undefined;
  name: string;
  version?: string | undefined;
  metadata?: GameMetadata | undefined;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(
    contextOrPlayers: GamePlayer[] | GameInitContext,
    options?: { seed?: number; [key: string]: unknown },
  ): TState;

  validateMove(
    state: TState,
    move: TMove,
    playerId: string,
    nowMs?: number,
  ): GameValidationResult;

  applyMove(
    state: TState,
    move: TMove,
    playerId: string,
    seed?: number,
    nowMs?: number,
  ): TState;

  applyTimeout?(
    state: TState,
    expiredPlayerId: string,
    seed?: number,
    nowMs?: number,
  ): TState;

  /**
   * Fog-of-War / Security Projection:
   * Strips secret internal state (e.g. PRNG seeds, hidden tiles, opponent decks)
   * before the state is serialized and sent to clients.
   */
  projectPlayerView?(
    state: TState,
    viewerPlayerId: string | null,
  ): unknown;

  getNextPlayer(state: TState): string | null;

  isGameOver(state: TState): boolean;

  getResult(state: TState): TResult;
}

/** Legacy and convenient alias for GameCartridge. */
export type GameDefinition<TState = unknown, TMove = unknown, TResult = unknown> =
  GameCartridge<TState, TMove, TResult>;

