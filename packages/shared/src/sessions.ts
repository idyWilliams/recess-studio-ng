import { z } from 'zod';

export type GameSessionStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export interface GameSessionPlayer {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  seat: string;
  joinedAt: string;
}

export interface GameSessionResponse<TState = unknown, TResult = unknown> {
  id: string;
  publicId: string;
  gameId: string;
  status: GameSessionStatus;
  state: TState;
  stateVersion: number;
  currentPlayerId?: string | null;
  /**
   * Server-authoritative ISO-8601 deadline for the current turn (ADR-007), or null when the
   * session has no pending deadline (waiting/completed games, or games without turn timeouts).
   * Clients display this value; the server never trusts a client-supplied deadline.
   */
  turnDeadlineAt?: string | null;
  result?: TResult | null;
  players: GameSessionPlayer[];
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createSessionSchema = z.object({
  gameId: z.string().min(1).max(64),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const joinSessionSchema = z.object({
  seat: z.string().max(8).optional(),
});

export type JoinSessionInput = z.infer<typeof joinSessionSchema>;

export const submitMoveSchema = z.object({
  move: z.unknown(),
  expectedStateVersion: z.number().int().nonnegative(),
});

export type SubmitMoveInput = z.infer<typeof submitMoveSchema>;
