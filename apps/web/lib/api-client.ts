import axios, { type AxiosInstance } from 'axios';

import {
  WORD_BATTLE_GAME_ID,
  type WordBattleMove,
  type WordBattleResult,
  type WordBattleState,
} from '@recess/game-word-battle';
import {
  ApiErrorCode,
  type ApiErrorBody,
  type AuthUserResponse,
  type GameSessionResponse,
  type LivePlayerStatsResponse,
  type RegisterResponse,
  type RegisterUserInput,
} from '@recess/shared';

/**
 * A Word Battle session as served by the API: the shared session envelope with the
 * game-core state/result types. Waiting sessions carry an empty placeholder `state`
 * (no board yet) — check `status` before reading game fields.
 */
export type WordBattleSession = GameSessionResponse<WordBattleState, WordBattleResult>;

/** Error codes the client can surface in addition to the API's own codes. */
export type ApiClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

/**
 * Normalized transport error. `code` carries the API's stable error code when the
 * server answered, or NETWORK_ERROR/UNKNOWN_ERROR when it did not.
 */
export class ApiClientError extends Error {
  readonly code: ApiClientErrorCode;
  readonly status: number;

  constructor(code: ApiClientErrorCode, message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

const API_ERROR_CODES: readonly string[] = Object.values(ApiErrorCode);

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && API_ERROR_CODES.includes(value);
}

/** Minimal shape of an AxiosError, so the mapping stays unit-testable without axios. */
interface TransportErrorLike {
  response?: { status?: unknown; data?: unknown } | undefined;
  message?: unknown;
}

/** Maps a caught transport error (axios or otherwise) to a normalized ApiClientError. */
export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  const candidate = error as TransportErrorLike | null | undefined;
  if (candidate && typeof candidate === 'object' && candidate.response) {
    const status =
      typeof candidate.response.status === 'number' ? candidate.response.status : 0;
    const body = candidate.response.data as Partial<ApiErrorBody> | undefined;
    if (
      body &&
      isApiErrorCode(body.code) &&
      typeof body.message === 'string'
    ) {
      return new ApiClientError(body.code, body.message, status);
    }
    return new ApiClientError(
      'UNKNOWN_ERROR',
      'The server returned an unrecognized error response',
      status,
    );
  }

  return new ApiClientError(
    'NETWORK_ERROR',
    'Could not reach the Recess server — check your connection and try again',
    0,
  );
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // In browser: always use relative same-origin path '/backend-api' proxied by Next.js rewrites.
    // This completely eliminates CORS, tunnel domain mismatches, and localhost routing errors on mobile.
    return '/backend-api';
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.API_PROXY_TARGET ||
    'http://127.0.0.1:4000'
  );
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    // Same-origin path proxied to apps/api by the Next.js server (see next.config.ts
    // rewrites) — keeps browser traffic same-origin without a CORS plugin on the API.
    baseURL: getApiBaseUrl(),
    // A hung request must surface as an error instead of blocking the UI indefinitely.
    timeout: 10_000,
  });

  if (typeof window !== 'undefined') {
    client.interceptors.request.use((config) => {
      // Ensure browser requests stay relative to current origin on Cloudflare tunnels
      if (!config.baseURL || config.baseURL.includes('localhost') || config.baseURL.includes('127.0.0.1')) {
        config.baseURL = '/backend-api';
      }
      return config;
    });
  }

  return client;
}

export const api = createApiClient();

function authConfig(sessionToken: string) {
  return { headers: { Authorization: `Bearer ${sessionToken}` } };
}

/** POST /players/register — creates an account or restores an existing profile by WhatsApp number. */
export async function registerUser(
  input: string | RegisterUserInput,
): Promise<RegisterResponse> {
  try {
    const payload: RegisterUserInput =
      typeof input === 'string' ? { username: input } : input;
    const { data } = await api.post<RegisterResponse>('/players/register', payload);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/** GET /players/live-stats — returns live player telemetry and active game match counts. */
export async function fetchLivePlayerStats(): Promise<LivePlayerStatsResponse> {
  try {
    const { data } = await api.get<LivePlayerStatsResponse>('/players/live-stats');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/** POST /players/heartbeat — records player presence activity. */
export async function sendPlayerHeartbeat(sessionToken?: string): Promise<boolean> {
  if (!sessionToken) return false;
  try {
    const { data } = await api.post<{ ok: boolean }>(
      '/players/heartbeat',
      {},
      authConfig(sessionToken),
    );
    return data.ok;
  } catch {
    return false;
  }
}

/** GET /me — verifies a session token and returns the owner's account + profile. */
export async function fetchCurrentUser(sessionToken: string): Promise<AuthUserResponse> {
  try {
    const { data } = await api.get<AuthUserResponse>('/me', authConfig(sessionToken));
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/** POST /game-sessions — creates a waiting Word Battle session (creator takes seat 0). */
export async function createWordBattleSession(
  sessionToken: string,
): Promise<WordBattleSession> {
  try {
    const { data } = await api.post<WordBattleSession>(
      '/game-sessions',
      { gameId: WORD_BATTLE_GAME_ID },
      authConfig(sessionToken),
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/** GET /game-sessions/:publicId — public read; lazily reconciles expired turns. */
export async function fetchGameSession(publicId: string): Promise<WordBattleSession> {
  try {
    const { data } = await api.get<WordBattleSession>(
      `/game-sessions/${publicId}`,
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/** POST /game-sessions/:publicId/join — joins a waiting session (auto-starts at 2 players). */
export async function joinGameSession(
  sessionToken: string,
  publicId: string,
): Promise<WordBattleSession> {
  try {
    const { data } = await api.post<WordBattleSession>(
      `/game-sessions/${publicId}/join`,
      {},
      authConfig(sessionToken),
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/**
 * POST /game-sessions/:publicId/moves — submits a move intent with the state version the
 * client observed. The server is authoritative: word-quality failures come back as a 200
 * with a penalty in the session history; version conflicts come back as 409
 * STALE_GAME_STATE. Never retried automatically — a lost response is indistinguishable
 * from an applied move.
 */
export async function submitGameMove(
  sessionToken: string,
  publicId: string,
  move: WordBattleMove,
  expectedStateVersion: number,
): Promise<WordBattleSession> {
  try {
    const { data } = await api.post<WordBattleSession>(
      `/game-sessions/${publicId}/moves`,
      { move, expectedStateVersion },
      authConfig(sessionToken),
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/**
 * POST /game-sessions/:publicId/expire-turn — asks the server to reconcile the current
 * turn against its persisted deadline. The request carries no authority: before the
 * deadline the server answers 409 TURN_NOT_EXPIRED, and if the state already advanced
 * it answers 409 STALE_GAME_STATE. Both are benign for the caller.
 */
export async function requestTurnExpiry(
  sessionToken: string,
  publicId: string,
  expectedStateVersion: number,
): Promise<WordBattleSession> {
  try {
    const { data } = await api.post<WordBattleSession>(
      `/game-sessions/${publicId}/expire-turn`,
      { expectedStateVersion },
      authConfig(sessionToken),
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/**
 * POST /game-sessions/:publicId/rematch — 1-Tap Rematch Handshake (Phase 2).
 * Provisions a fresh match linked to the same two players with the loser taking first turn.
 */
export async function requestRematch(
  sessionToken: string,
  publicId: string,
): Promise<WordBattleSession> {
  try {
    const { data } = await api.post<WordBattleSession>(
      `/game-sessions/${publicId}/rematch`,
      {},
      authConfig(sessionToken),
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
