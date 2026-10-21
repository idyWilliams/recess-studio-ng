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
import { dictionaryApiValidator, type WordValidator } from '../games/word-validator.js';
import type {
  SessionRecord,
  SessionRepository,
  SessionWithPlayers,
} from './session-repository.js';

/**
 * Fixed server-authoritative turn duration (ADR-007). A deadline is established when a turn
 * becomes active and is never extended: reads, reconnects, retries, and polling have no
 * influence on it.
 */
export const TURN_DURATION_MS = 15_000;

/** A game definition as resolved from the registry (validated at each call site). */
type RegisteredGame = NonNullable<ReturnType<GameRegistry['get']>>;

export class SessionService {
  constructor(
    private repo: SessionRepository,
    private gameRegistry: GameRegistry = new GameRegistry(),
    private wordValidator: WordValidator = dictionaryApiValidator,
    /** Injected clock — tests drive it deterministically; production uses the wall clock. */
    private now: () => Date = () => new Date(),
  ) {}

  private mapResponse(
    session: SessionWithPlayers,
    viewerUserId?: string | null,
  ): GameSessionResponse {
    const players: GameSessionPlayer[] = session.players.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl ?? null,
      seat: p.seat,
      joinedAt: p.joinedAt,
    }));

    const game = this.gameRegistry.get(session.gameId);
    let state = session.state;
    if (
      game &&
      typeof (game as { projectPlayerView?: unknown }).projectPlayerView === 'function' &&
      state !== null &&
      state !== undefined &&
      typeof state === 'object'
    ) {
      state = (game as { projectPlayerView: (s: unknown, v: string | null) => unknown }).projectPlayerView(
        state,
        viewerUserId ?? null,
      );
    }

    return {
      id: session.id,
      publicId: session.publicId,
      gameId: session.gameId,
      status: session.status as GameSessionStatus,
      state,
      stateVersion: session.stateVersion,
      currentPlayerId: session.currentPlayerId,
      result: session.result,
      turnDeadlineAt: session.turnDeadlineAt,
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

  async getSession(
    publicId: string,
    viewerUserId?: string | null,
  ): Promise<GameSessionResponse> {
    const session = await this.repo.findSessionByPublicId(publicId);
    if (!session) {
      throw new AppError('GAME_NOT_FOUND', 'Game session not found', 404);
    }
    // Lazy timeout reconciliation (ADR-007): an already-expired deadline is applied on read
    // so clients observe the authoritative consequence immediately, without waiting for the
    // background sweeper. Repeated reads after expiry are no-ops (the deadline is consumed).
    const now = this.now();
    const { session: reconciled } = await this.reconcileSessionIfExpired(session, now);
    return this.mapResponse(reconciled, viewerUserId);
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
      const turnDeadlineAt = this.computeTurnDeadline(
        game,
        initialState,
        currentPlayerId,
        this.now(),
      );

      await this.repo.startSession(
        updated.id,
        initialState,
        currentPlayerId,
        turnDeadlineAt,
      );

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
    rawInput: SubmitMoveInput,
  ): Promise<GameSessionResponse> {
    const parsed = submitMoveSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new AppError(
        'INVALID_INPUT',
        parsed.error.errors[0]?.message ?? 'Invalid move payload',
        400,
      );
    }
    let input: SubmitMoveInput = rawInput;

    // Client-submitted timeout moves are rejected outright (ADR-007): a timeout penalty is
    // applied ONLY by the server-authoritative transition (expire-turn reconciliation, lazy
    // read reconciliation, or the sweeper), and only after the persisted deadline has
    // actually expired per server time. Clients can never author a timeout.
    const submittedMove = input.move as Record<string, unknown> | null | undefined;
    if (
      submittedMove !== null &&
      typeof submittedMove === 'object' &&
      submittedMove.type === 'timeout'
    ) {
      throw new AppError(
        'INVALID_MOVE',
        'Timeout moves cannot be submitted directly; request reconciliation via the expire-turn endpoint',
        400,
      );
    }

    let session = await this.repo.findSessionByPublicId(publicId);
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

    const now = this.now();

    // Lazy timeout reconciliation (ADR-007): if the persisted deadline has already passed,
    // apply the authoritative timeout transition BEFORE evaluating this move, so a late move
    // can never steal a turn the deadline has already consumed.
    session = (await this.reconcileSessionIfExpired(session, now)).session;

    // The timeout may have ended the match (e.g. knockout); re-check before continuing.
    if (session.status !== 'active') {
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

    // 5.1 Game-specific API boundary validations (dictionary lookup)
    //
    // For word-battle, validate the submitted word against the local dictionary.
    // Instead of rejecting at the HTTP layer (which would prevent the game core
    // from recording the penalty), we set isDictionaryValid: false on the move.
    // The game core then applies the life penalty and records history correctly.
    if (session.gameId === 'word-battle') {
      const movePayload = input.move as Record<string, unknown>;
      const word = movePayload?.word;
      if (typeof word !== 'string' || word.trim().length === 0) {
        throw new AppError('INVALID_MOVE', 'Word must be a non-empty string', 400);
      }
      const isDictionaryValid = await this.wordValidator.isValidWord(word);
      // Flag the move with dictionary validity so the game core can apply
      // the appropriate penalty if the word is not in the dictionary.
      input = {
        ...input,
        move: { ...movePayload, isDictionaryValid },
      };
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
    // The new turn's deadline is established server-side from the same clock reading;
    // terminated games carry no deadline.
    const nextTurnDeadlineAt = isGameOver
      ? null
      : this.computeTurnDeadline(game, nextState, nextPlayerId, now);

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
      nextTurnDeadlineAt,
    });

    return this.mapResponse(updated);
  }

  /**
   * Server-verified turn-expiry request (ADR-007). A client may ask the server to reconcile
   * the current turn, but the request itself carries no authority: the timeout is applied
   * only when the persisted deadline has actually expired per server time. The response is
   * the post-transition session; a request referencing an already-advanced state is rejected
   * with 409 STALE_GAME_STATE so clients can safely discard it.
   */
  async expireTurn(
    userId: string,
    publicId: string,
    expectedStateVersion: number,
  ): Promise<GameSessionResponse> {
    const session = await this.repo.findSessionByPublicId(publicId);
    if (!session) {
      throw new AppError('GAME_NOT_FOUND', 'Game session not found', 404);
    }

    const isParticipant = session.players.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new AppError(
        'PLAYER_NOT_IN_GAME',
        'You are not a player in this game session',
        403,
      );
    }

    if (session.status !== 'active') {
      throw new AppError('GAME_NOT_ACTIVE', 'Game session is not active', 400);
    }

    if (expectedStateVersion !== session.stateVersion) {
      throw new AppError(
        'STALE_GAME_STATE',
        `State version mismatch. Current version is ${session.stateVersion}, expected ${expectedStateVersion}`,
        409,
      );
    }

    const updated = await this.applyTurnTimeout(session, this.now());
    return this.mapResponse(updated);
  }

  /**
   * Bounded sweep step (ADR-007): reconciles up to `limit` active sessions whose persisted
   * deadline has passed, oldest deadline first. Safe to run from multiple processes and to
   * re-run at any time — every transition reuses the same optimistic-locking commit as a
   * regular move, so a given turn can be timed out at most once. Per-session failures never
   * abort the batch; unexpected ones are reported via `onError`.
   */
  async reconcileExpiredTurns(
    limit: number,
    onError?: (error: unknown, context: { sessionId: string }) => void,
  ): Promise<{ scanned: number; reconciled: number }> {
    const now = this.now();
    const ids = await this.repo.findExpiredActiveSessions(now, limit);
    let reconciled = 0;

    for (const sessionId of ids) {
      try {
        const session = await this.repo.findSessionById(sessionId);
        if (!session) continue;
        const { transitioned } = await this.reconcileSessionIfExpired(session, now);
        if (transitioned) {
          reconciled += 1;
        }
      } catch (err) {
        onError?.(err, { sessionId });
      }
    }

    return { scanned: ids.length, reconciled };
  }

  /**
   * Detects whether a game definition supports timeout moves without mutating anything
   * (capability probe). Games whose `validateMove` rejects `{ type: 'timeout' }` — e.g. the
   * take-turn demo — simply never receive a turn deadline.
   */
  private gameSupportsTurnTimeouts(
    game: RegisteredGame,
    state: unknown,
    playerId: string,
  ): boolean {
    try {
      return game.validateMove(state, { type: 'timeout' }, playerId).ok;
    } catch {
      // A definition that throws on probe input does not support timeouts.
      return false;
    }
  }

  /** Deadline for a newly active turn, or null when the game does not support timeouts. */
  private computeTurnDeadline(
    game: RegisteredGame,
    state: unknown,
    currentPlayerId: string | null,
    now: Date,
  ): Date | null {
    if (
      !currentPlayerId ||
      !this.gameSupportsTurnTimeouts(game, state, currentPlayerId)
    ) {
      return null;
    }
    return new Date(now.getTime() + TURN_DURATION_MS);
  }

  /**
   * Applies the authoritative timeout transition if — and only if — the persisted deadline
   * has already elapsed. Returns the session unchanged otherwise. Races with concurrent
   * actors (a move, another instance's sweep, a parallel reconciliation) are resolved by
   * re-reading the fresh record instead of surfacing a conflict on read paths.
   */
  private async reconcileSessionIfExpired(
    session: SessionWithPlayers,
    now: Date,
  ): Promise<{ session: SessionWithPlayers; transitioned: boolean }> {
    if (session.status !== 'active' || session.turnDeadlineAt === null) {
      return { session, transitioned: false };
    }
    if (now.getTime() < Date.parse(session.turnDeadlineAt)) {
      return { session, transitioned: false };
    }

    // Self-heal for sessions whose game definition cannot process timeout moves (e.g.
    // take-turn-demo rows that received the ADR-007 deployment backfill deadline): such a
    // deadline can never be honoured, so it is cleared as infrastructure metadata — no game
    // state changes, no penalty, no turn advance — instead of surfacing an INVALID_MOVE
    // error on every read and trapping the sweeper in an endless retry loop.
    const game = this.gameRegistry.get(session.gameId);
    const playerId = session.currentPlayerId;
    if (
      game &&
      playerId &&
      !this.gameSupportsTurnTimeouts(game, session.state, playerId)
    ) {
      const cleared = await this.repo.clearTurnDeadline(
        session.id,
        session.stateVersion,
      );
      if (cleared) {
        return { session: cleared, transitioned: false };
      }
      // A concurrent writer beat the clear (e.g. a move); report the fresh record.
      const fresh = await this.repo.findSessionById(session.id);
      return { session: fresh ?? session, transitioned: false };
    }

    try {
      const updated = await this.applyTurnTimeout(session, now);
      return { session: updated, transitioned: true };
    } catch (err) {
      if (
        err instanceof AppError &&
        (err.code === 'STALE_GAME_STATE' || err.code === 'GAME_NOT_ACTIVE')
      ) {
        const fresh = await this.repo.findSessionById(session.id);
        return { session: fresh ?? session, transitioned: false };
      }
      throw err;
    }
  }

  /**
   * The single authoritative timeout transition (ADR-007). It re-verifies eligibility against
   * persisted data before touching anything: the session must be active, a deadline must be
   * stored (games without timeout support never have one), and the deadline must have actually
   * expired per server time. The penalty itself is computed by the pure game core via a
   * `{ type: 'timeout' }` move and committed through the same optimistic-locking CAS and
   * `game_moves` unique index as a regular move, so concurrent callers can never apply the
   * timeout twice, and the timed-out player is recorded as the move's author for audit.
   */
  private async applyTurnTimeout(
    session: SessionRecord,
    now: Date,
  ): Promise<SessionWithPlayers> {
    if (session.status !== 'active') {
      throw new AppError('GAME_NOT_ACTIVE', 'Game session is not active', 400);
    }
    if (!session.turnDeadlineAt) {
      throw new AppError(
        'TURN_NOT_EXPIRED',
        'This game session has no stored turn deadline to enforce',
        409,
      );
    }
    if (now.getTime() < Date.parse(session.turnDeadlineAt)) {
      throw new AppError(
        'TURN_NOT_EXPIRED',
        'The turn deadline has not expired yet',
        409,
      );
    }

    const playerId = session.currentPlayerId;
    if (!playerId) {
      throw new AppError('GAME_NOT_ACTIVE', 'Game session has no active player', 400);
    }

    const game = this.gameRegistry.get(session.gameId);
    if (!game) {
      throw new AppError(
        'GAME_NOT_FOUND',
        'Game definition not found in registry',
        500,
      );
    }

    // Capability + turn guard: if the game does not accept timeout moves, NOTHING is
    // applied — no life is deducted, no points change, the turn does not advance.
    const timeoutMove = { type: 'timeout' };
    const validation = game.validateMove(session.state, timeoutMove, playerId);
    if (!validation.ok) {
      throw new AppError(
        'INVALID_MOVE',
        `Timeout is not applicable to this game session: ${validation.message}`,
        409,
      );
    }

    const nextState = game.applyMove(session.state, timeoutMove, playerId);
    const isGameOver = game.isGameOver(nextState);
    const nextPlayerId = game.getNextPlayer(nextState);
    const result = isGameOver ? game.getResult(nextState) : null;
    const nextTurnDeadlineAt = isGameOver
      ? null
      : this.computeTurnDeadline(game, nextState, nextPlayerId, now);

    return this.repo.applyMove({
      sessionId: session.id,
      userId: playerId,
      move: timeoutMove,
      expectedVersion: session.stateVersion,
      nextState,
      nextPlayerId,
      isGameOver,
      result,
      nextTurnDeadlineAt,
    });
  }

  /**
   * 1-Tap Rematch Handshake (Phase 2):
   * Provisions or joins a rematch session linked to the same two players.
   * Seat 0 and first turn are assigned to the loser of the previous match.
   */
  async rematch(userId: string, publicId: string): Promise<GameSessionResponse> {
    const session = await this.repo.findSessionByPublicId(publicId);
    if (!session) {
      throw new AppError('GAME_NOT_FOUND', 'Game session not found', 404);
    }

    const caller = session.players.find((p) => p.userId === userId);
    if (!caller) {
      throw new AppError(
        'PLAYER_NOT_IN_GAME',
        'Only match participants can request a rematch',
        403,
      );
    }

    if (session.status !== 'completed') {
      throw new AppError(
        'GAME_NOT_ACTIVE',
        'Cannot rematch while game is active',
        400,
      );
    }

    if (session.players.length !== 2) {
      throw new AppError(
        'INVALID_INPUT',
        'Rematch requires exactly 2 players',
        400,
      );
    }

    // Handshake check: if a rematch was already created for this match, return it
    const existingResult = (session.result ?? {}) as Record<string, unknown>;
    if (typeof existingResult.rematchPublicId === 'string') {
      return this.getSession(existingResult.rematchPublicId, userId);
    }

    // Determine seat assignment: Loser gets first turn (seat 0)
    const [p0, p1] = session.players;
    const winnerId = (existingResult as { winnerId?: string | null }).winnerId;
    let firstPlayer = p0!;
    let secondPlayer = p1!;

    if (winnerId && winnerId === p0!.userId) {
      // p0 won, so p1 (the loser) gets first turn
      firstPlayer = p1!;
      secondPlayer = p0!;
    } else if (winnerId && winnerId === p1!.userId) {
      // p1 won, so p0 (the loser) gets first turn
      firstPlayer = p0!;
      secondPlayer = p1!;
    } else {
      // Draw / no single winner: swap seats so players alternate starting
      firstPlayer = p1!;
      secondPlayer = p0!;
    }

    const game = this.gameRegistry.get(session.gameId);
    if (!game) {
      throw new AppError('GAME_NOT_FOUND', `Game '${session.gameId}' not found`, 404);
    }

    const rematchPublicId = crypto.randomBytes(6).toString('hex');
    const gamePlayers = [
      { id: firstPlayer.userId, displayName: firstPlayer.username },
      { id: secondPlayer.userId, displayName: secondPlayer.username },
    ];
    const initialState = game.createInitialState(gamePlayers);
    const initialPlayerId = game.getNextPlayer(initialState) ?? firstPlayer.userId;
    const turnDeadlineAt = new Date(this.now().getTime() + TURN_DURATION_MS);

    // 1. Create rematch session with loser in seat 0
    const newSession = await this.repo.createSession({
      publicId: rematchPublicId,
      gameId: session.gameId,
      status: 'waiting',
      state: {},
      stateVersion: 0,
      currentPlayerId: null,
      creatorUserId: firstPlayer.userId,
      creatorSeat: '0',
      creatorUsername: firstPlayer.username,
    });

    // 2. Add second player in seat 1
    await this.repo.addPlayer(
      newSession.id,
      secondPlayer.userId,
      '1',
      secondPlayer.username,
    );

    // 3. Mark session active with turn deadline
    await this.repo.startSession(
      newSession.id,
      initialState,
      initialPlayerId,
      turnDeadlineAt,
    );

    // 4. Record rematchPublicId on original session so second player is routed seamlessly
    const updatedResult = { ...existingResult, rematchPublicId };
    await this.repo.updateSessionResult(session.id, updatedResult);

    return this.getSession(rematchPublicId, userId);
  }
}
