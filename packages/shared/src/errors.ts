/** Stable API error codes for client handling and logging. */
export const ApiErrorCode = {
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_NOT_ACTIVE: 'GAME_NOT_ACTIVE',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_MOVE: 'INVALID_MOVE',
  STALE_GAME_STATE: 'STALE_GAME_STATE',
  TURN_NOT_EXPIRED: 'TURN_NOT_EXPIRED',
  PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
  MATCHMAKING_UNAVAILABLE: 'MATCHMAKING_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_INPUT: 'INVALID_INPUT',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}
