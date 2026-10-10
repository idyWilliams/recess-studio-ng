import crypto from 'node:crypto';

import type {
  CreateSessionInput,
  GameSessionPlayer,
  GameSessionResponse,
  GameSessionStatus,
  JoinSessionInput,
  SubmitMoveInput,
} from '@recess/shared';
import {
  createSessionSchema,
  joinSessionSchema,
  submitMoveSchema,
} from '@recess/shared';

import { AppError } from '../errors/app-error.js';
import { GameRegistry } from '../games/game-registry.js';
import type { SessionRepository, SessionWithPlayers } from './session-repository.js';

export class SessionService {
  constructor(
    private repo: SessionRepository,
    private gameRegistry: GameRegistry = new GameRegistry(),
  ) {}

  private mapResponse(session: SessionWithPlayers): GameSessionResponse {
    const players: GameSessionPlayer[] = session.players.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl ?? null,
      seat: p.seat,
      joinedAt: p.joinedAt,
    }));

    return {
      id: session.id,
      publicId: session.publicId,
      gameId: session.gameId,
      status: session.status as GameSessionStatus,
      state: session.state,
      stateVersion: session.stateVersion,
      currentPlayerId: session.currentPlayerId,
      result: session.result,
      players,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async createSession(
    userId: string,
    input: CreateSessionInput,
  ): Promise<GameSessionResponse> {
    const parsed = createSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'INVALID_INPUT',
        parsed.error.errors[0]?.message ?? 'Invalid session payload',
        400,
      );
    }

    const game = this.gameRegistry.get(input.gameId);
    if (!game) {
      throw new AppError('GAME_NOT_FOUND', `Game '${input.gameId}' not found`, 404);
    }

    const publicId = crypto.randomBytes(6).toString('hex');

    const session = await this.repo.createSession({
      publicId,
      gameId: input.gameId,
      status: 'waiting',
      state: {},
      stateVersion: 0,
      currentPlayerId: null,
      creatorUserId: userId,
      creatorSeat: '0',
    });

    return this.mapResponse(session);
  }

  async getSession(publicId: string): Promise<GameSessionResponse> {
    const session = await this.repo.findSessionByPublicId(publicId);
    if (!session) {
      throw new AppError('GAME_NOT_FOUND', 'Game session not found', 404);
    }
    return this.mapResponse(session);
  }

  async joinSession(
    userId: string,
    publicId: string,
    input: JoinSessionInput = {},
  ): Promise<GameSessionResponse> {
    const parsed = joinSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'INVALID_INPUT',
        parsed.error.errors[0]?.message ?? 'Invalid join payload',
        400,
      );
    }

    const session = await this.repo.findSessionByPublicId(publicId);
    if (!session) {
      throw new AppError('GAME_NOT_FOUND', 'Game session not found', 404);
    }

    if (session.players.some((p) => p.userId === userId)) {
      throw new AppError(
        'INVALID_INPUT',
        'You have already joined this game session',
        409,
      );
    }

    if (session.status !== 'waiting') {
      throw new AppError(
        'GAME_NOT_ACTIVE',
        'Game session is no longer accepting new players',
        400,
      );
    }

    const game = this.gameRegistry.get(session.gameId);
    if (!game) {
      throw new AppError('GAME_NOT_FOUND', `Game '${session.gameId}' not found`, 404);
    }

    if (session.players.length >= game.maxPlayers) {
      throw new AppError('INVALID_INPUT', 'Game session is full', 400);
    }

    const seat = input.seat ?? String(session.players.length);
    await this.repo.addPlayer(session.id, userId, seat);

    const updated = await this.repo.findSessionById(session.id);
    if (!updated) {
      throw new Error('Failed to load updated session');
    }

    // If minimum players joined, initialize state and start game!
    if (updated.players.length >= game.minPlayers && updated.status === 'waiting') {
      const gamePlayers = updated.players.map((p) => ({
        id: p.userId,
        displayName: p.username,
      }));

      const initialState = game.createInitialState(gamePlayers);
      const currentPlayerId = game.getNextPlayer(initialState);

      await this.repo.startSession(updated.id, initialState, currentPlayerId);

      const activeSession = await this.repo.findSessionById(session.id);
      if (!activeSession) {
        throw new Error('Failed to load active session');
      }
      return this.mapResponse(activeSession);
    }

    return this.mapResponse(updated);
  }

  async submitMove(
    userId: string,
    publicId: string,
    input: SubmitMoveInput,
  ): Promise<GameSessionResponse> {
    const parsed = submitMoveSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        'INVALID_INPUT',
        parsed.error.errors[0]?.message ?? 'Invalid move payload',
        400,
      );
    }

    const session = await this.repo.findSessionByPublicId(publicId);
    if (!session) {
      throw new AppError('GAME_NOT_FOUND', 'Game session not found', 404);
    }

    // 1. Authorization: Only enrolled session participants can act
    const isParticipant = session.players.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new AppError(
        'PLAYER_NOT_IN_GAME',
        'You are not a player in this game session',
        403,
      );
    }

    // 2. Lifecycle check: Game must be active
    if (session.status === 'waiting') {
      throw new AppError('GAME_NOT_ACTIVE', 'Game has not started yet', 400);
    }
    if (session.status === 'completed' || session.status === 'abandoned') {
      throw new AppError('GAME_NOT_ACTIVE', 'Game session is already finished', 400);
    }

    // 3. Concurrency check: Reject stale moves
    if (input.expectedStateVersion !== session.stateVersion) {
      throw new AppError(
        'STALE_GAME_STATE',
        `State version mismatch. Current version is ${session.stateVersion}, expected ${input.expectedStateVersion}`,
        409,
      );
    }

    // 4. Turn check: Must be acting player's turn
    if (session.currentPlayerId !== userId) {
      throw new AppError('NOT_YOUR_TURN', 'It is not your turn', 400);
    }

    // 5. Game definition lookup
    const game = this.gameRegistry.get(session.gameId);
    if (!game) {
      throw new AppError(
        'GAME_NOT_FOUND',
        'Game definition not found in registry',
        500,
      );
    }

    // 6. Server-authoritative move validation
    const validation = game.validateMove(session.state, input.move, userId);
    if (!validation.ok) {
      if (validation.reason === 'NOT_YOUR_TURN') {
        throw new AppError('NOT_YOUR_TURN', validation.message, 400);
      }
      if (validation.reason === 'GAME_OVER') {
        throw new AppError('GAME_NOT_ACTIVE', validation.message, 400);
      }
      throw new AppError('INVALID_MOVE', validation.message, 400);
    }

    // 7. State transition & result calculation
    const nextState = game.applyMove(session.state, input.move, userId);
    const isGameOver = game.isGameOver(nextState);
    const nextPlayerId = game.getNextPlayer(nextState);
    const result = isGameOver ? game.getResult(nextState) : null;

    // 8. Atomic optimistic commit & move audit persistence
    const updated = await this.repo.applyMove({
      sessionId: session.id,
      userId,
      move: input.move,
      expectedVersion: input.expectedStateVersion,
      nextState,
      nextPlayerId,
      isGameOver,
      result,
    });

    return this.mapResponse(updated);
  }
}
