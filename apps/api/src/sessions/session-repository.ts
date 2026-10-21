import { and, asc, eq, isNotNull, lte } from 'drizzle-orm';

import {
  gameMoves,
  gamePlayers,
  gameSessions,
  gamingProfiles,
  type Database,
} from '@recess/database';

import { AppError } from '../errors/app-error.js';

export interface SessionRecord {
  id: string;
  publicId: string;
  gameId: string;
  status: string;
  state: unknown;
  stateVersion: number;
  currentPlayerId: string | null;
  result: unknown | null;
  /** ISO-8601 server-authoritative deadline for the current turn, or null (ADR-007). */
  turnDeadlineAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerRecord {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  seat: string;
  joinedAt: string;
}

export interface SessionWithPlayers extends SessionRecord {
  players: PlayerRecord[];
}

export interface SessionRepository {
  createSession(data: {
    publicId: string;
    gameId: string;
    status: string;
    state: unknown;
    stateVersion: number;
    currentPlayerId: string | null;
    creatorUserId: string;
    creatorSeat: string;
    /**
     * Display username for the creator's player row. Denormalized convenience data:
     * the Postgres repository ignores it and resolves usernames by joining
     * `gaming_profiles` at read time (the single source of truth); the InMemory
     * repository uses it as its fallback when no explicit `setUsername` entry exists.
     */
    creatorUsername?: string | undefined;
  }): Promise<SessionWithPlayers>;

  findSessionByPublicId(publicId: string): Promise<SessionWithPlayers | null>;
  findSessionById(id: string): Promise<SessionWithPlayers | null>;
  addPlayer(
    sessionId: string,
    userId: string,
    seat: string,
    username?: string | undefined,
  ): Promise<PlayerRecord>;
  startSession(
    sessionId: string,
    state: unknown,
    currentPlayerId: string | null,
    turnDeadlineAt: Date | null,
  ): Promise<void>;
  applyMove(data: {
    sessionId: string;
    userId: string;
    move: unknown;
    expectedVersion: number;
    nextState: unknown;
    nextPlayerId: string | null;
    isGameOver: boolean;
    result: unknown | null;
    /** Deadline for the turn created by this move; ignored (cleared) when the game ended. */
    nextTurnDeadlineAt: Date | null;
  }): Promise<SessionWithPlayers>;

  /**
   * Removes a stored turn deadline without touching game state. Used to self-heal sessions
   * whose game definition cannot process timeout moves but that carry a persisted deadline
   * (e.g. rows that received the ADR-007 deployment backfill). Optimistically guarded on
   * the state version — returns null when a concurrent writer has moved on, and the caller
   * re-reads the fresh record. A deadline is infrastructure metadata, not game state: no
   * state version is consumed, no move row is written.
   */
  clearTurnDeadline(
    sessionId: string,
    expectedVersion: number,
  ): Promise<SessionWithPlayers | null>;

  /**
   * Ids of active sessions whose persisted turn deadline is at or before `now`, oldest
   * deadline first. Used by the bounded timeout sweeper (ADR-007). Sessions without a
   * deadline (null) are never returned.
   */
  findExpiredActiveSessions(now: Date, limit: number): Promise<string[]>;

  /** Updates the final session result payload (e.g. attaching rematch publicId). */
  updateSessionResult(sessionId: string, result: unknown): Promise<void>;
}

type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export class PostgresSessionRepository implements SessionRepository {
  constructor(private db: Database) {}

  /** Maps a `game_sessions` row to the repository record shape (ISO timestamps). */
  private toSessionRecord(row: typeof gameSessions.$inferSelect): SessionRecord {
    return {
      id: row.id,
      publicId: row.publicId,
      gameId: row.gameId,
      status: row.status,
      state: row.state,
      stateVersion: row.stateVersion,
      currentPlayerId: row.currentPlayerId,
      result: row.result,
      turnDeadlineAt: row.turnDeadlineAt?.toISOString() ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getPlayersForSession(
    sessionId: string,
    executor: DbOrTx = this.db,
  ): Promise<PlayerRecord[]> {
    const rows = await executor
      .select({
        id: gamePlayers.id,
        sessionId: gamePlayers.sessionId,
        userId: gamePlayers.userId,
        seat: gamePlayers.seat,
        joinedAt: gamePlayers.joinedAt,
        username: gamingProfiles.username,
        avatarUrl: gamingProfiles.avatarUrl,
      })
      .from(gamePlayers)
      .innerJoin(gamingProfiles, eq(gamePlayers.userId, gamingProfiles.userId))
      .where(eq(gamePlayers.sessionId, sessionId))
      // Seat order (creator first) is game-semantic: games derive the starting
      // player from the first entry of the player list. Without an explicit
      // ORDER BY, PostgreSQL may return rows in any order, making the opening
      // player — and with it the authoritative turn owner and turn deadline —
      // nondeterministic. joinedAt/id keep the order total even for equal seats.
      .orderBy(asc(gamePlayers.seat), asc(gamePlayers.joinedAt), asc(gamePlayers.id));

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId,
      username: r.username,
      avatarUrl: r.avatarUrl,
      seat: r.seat,
      joinedAt: r.joinedAt.toISOString(),
    }));
  }

  async createSession(data: {
    publicId: string;
    gameId: string;
    status: string;
    state: unknown;
    stateVersion: number;
    currentPlayerId: string | null;
    creatorUserId: string;
    creatorSeat: string;
    /** Accepted for interface compatibility; Postgres resolves usernames via JOIN. */
    creatorUsername?: string | undefined;
  }): Promise<SessionWithPlayers> {
    return await this.db.transaction(async (tx) => {
      const [insertedSession] = await tx
        .insert(gameSessions)
        .values({
          publicId: data.publicId,
          gameId: data.gameId,
          status: data.status,
          state: data.state as Record<string, unknown>,
          stateVersion: data.stateVersion,
          currentPlayerId: data.currentPlayerId,
        })
        .returning();

      if (!insertedSession) {
        throw new Error('Failed to insert game session');
      }

      await tx.insert(gamePlayers).values({
        sessionId: insertedSession.id,
        userId: data.creatorUserId,
        seat: data.creatorSeat,
      });

      const players = await this.getPlayersForSession(insertedSession.id, tx);

      return { ...this.toSessionRecord(insertedSession), players };
    });
  }

  async findSessionByPublicId(publicId: string): Promise<SessionWithPlayers | null> {
    const [session] = await this.db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.publicId, publicId))
      .limit(1);

    if (!session) return null;

    const players = await this.getPlayersForSession(session.id);

    return { ...this.toSessionRecord(session), players };
  }

  async findSessionById(id: string): Promise<SessionWithPlayers | null> {
    const [session] = await this.db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, id))
      .limit(1);

    if (!session) return null;

    const players = await this.getPlayersForSession(session.id);

    return { ...this.toSessionRecord(session), players };
  }

  async addPlayer(
    sessionId: string,
    userId: string,
    seat: string,
    _username?: string | undefined,
  ): Promise<PlayerRecord> {
    try {
      const [inserted] = await this.db
        .insert(gamePlayers)
        .values({
          sessionId,
          userId,
          seat,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to insert game player');
      }

      const [profile] = await this.db
        .select()
        .from(gamingProfiles)
        .where(eq(gamingProfiles.userId, userId))
        .limit(1);

      return {
        id: inserted.id,
        sessionId: inserted.sessionId,
        userId: inserted.userId,
        username: profile?.username ?? 'Unknown',
        avatarUrl: profile?.avatarUrl ?? null,
        seat: inserted.seat,
        joinedAt: inserted.joinedAt.toISOString(),
      };
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new AppError(
          'INVALID_INPUT',
          'Player is already enrolled or seat is already occupied',
          409,
        );
      }
      throw err;
    }
  }

  async startSession(
    sessionId: string,
    state: unknown,
    currentPlayerId: string | null,
    turnDeadlineAt: Date | null,
  ): Promise<void> {
    await this.db
      .update(gameSessions)
      .set({
        status: 'active',
        state: state as Record<string, unknown>,
        currentPlayerId,
        turnDeadlineAt,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(gameSessions.id, sessionId), eq(gameSessions.status, 'waiting')));
  }

  async applyMove(data: {
    sessionId: string;
    userId: string;
    move: unknown;
    expectedVersion: number;
    nextState: unknown;
    nextPlayerId: string | null;
    isGameOver: boolean;
    result: unknown | null;
    nextTurnDeadlineAt: Date | null;
  }): Promise<SessionWithPlayers> {
    const newVersion = data.expectedVersion + 1;
    const now = new Date();

    return await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(gameSessions)
        .set({
          state: data.nextState as Record<string, unknown>,
          stateVersion: newVersion,
          currentPlayerId: data.nextPlayerId,
          status: data.isGameOver ? 'completed' : 'active',
          result: data.result as Record<string, unknown> | null,
          // Completed sessions must never carry a live deadline.
          turnDeadlineAt: data.isGameOver ? null : data.nextTurnDeadlineAt,
          completedAt: data.isGameOver ? now : null,
          updatedAt: now,
        })
        .where(
          and(
            eq(gameSessions.id, data.sessionId),
            eq(gameSessions.stateVersion, data.expectedVersion),
          ),
        )
        .returning();

      if (!updated) {
        const [current] = await tx
          .select({ stateVersion: gameSessions.stateVersion })
          .from(gameSessions)
          .where(eq(gameSessions.id, data.sessionId));

        throw new AppError(
          'STALE_GAME_STATE',
          `State version conflict. Current version is ${current?.stateVersion ?? 'unknown'}, expected ${data.expectedVersion}`,
          409,
        );
      }

      await tx.insert(gameMoves).values({
        sessionId: data.sessionId,
        userId: data.userId,
        move: data.move as Record<string, unknown>,
        stateVersionAfter: newVersion,
      });

      const players = await this.getPlayersForSession(data.sessionId, tx);

      return { ...this.toSessionRecord(updated), players };
    });
  }

  async clearTurnDeadline(
    sessionId: string,
    expectedVersion: number,
  ): Promise<SessionWithPlayers | null> {
    return await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(gameSessions)
        .set({ turnDeadlineAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(gameSessions.id, sessionId),
            eq(gameSessions.stateVersion, expectedVersion),
          ),
        )
        .returning();

      if (!updated) return null;

      const players = await this.getPlayersForSession(sessionId, tx);

      return { ...this.toSessionRecord(updated), players };
    });
  }

  async findExpiredActiveSessions(now: Date, limit: number): Promise<string[]> {
    const rows = await this.db
      .select({ id: gameSessions.id })
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.status, 'active'),
          isNotNull(gameSessions.turnDeadlineAt),
          lte(gameSessions.turnDeadlineAt, now),
        ),
      )
      .orderBy(asc(gameSessions.turnDeadlineAt))
      .limit(limit);

    return rows.map((row) => row.id);
  }

  async updateSessionResult(sessionId: string, result: unknown): Promise<void> {
    await this.db
      .update(gameSessions)
      .set({ result, updatedAt: new Date() })
      .where(eq(gameSessions.id, sessionId));
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, SessionRecord>();
  private players = new Map<string, PlayerRecord[]>();
  private usernames = new Map<string, string>();

  setUsername(userId: string, username: string): void {
    this.usernames.set(userId, username);
  }

  async createSession(data: {
    publicId: string;
    gameId: string;
    status: string;
    state: unknown;
    stateVersion: number;
    currentPlayerId: string | null;
    creatorUserId: string;
    creatorSeat: string;
    creatorUsername?: string | undefined;
  }): Promise<SessionWithPlayers> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session: SessionRecord = {
      id,
      publicId: data.publicId,
      gameId: data.gameId,
      status: data.status,
      state: data.state,
      stateVersion: data.stateVersion,
      currentPlayerId: data.currentPlayerId,
      result: null,
      turnDeadlineAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);

    const player: PlayerRecord = {
      id: crypto.randomUUID(),
      sessionId: id,
      userId: data.creatorUserId,
      username: this.usernames.get(data.creatorUserId) ?? data.creatorUsername ?? 'Player',
      seat: data.creatorSeat,
      joinedAt: now,
    };
    this.players.set(id, [player]);

    return { ...session, players: [player] };
  }

  async findSessionByPublicId(publicId: string): Promise<SessionWithPlayers | null> {
    for (const session of this.sessions.values()) {
      if (session.publicId === publicId) {
        const players = this.players.get(session.id) ?? [];
        return { ...session, players };
      }
    }
    return null;
  }

  async findSessionById(id: string): Promise<SessionWithPlayers | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    const players = this.players.get(id) ?? [];
    return { ...session, players };
  }

  async addPlayer(
    sessionId: string,
    userId: string,
    seat: string,
    username?: string | undefined,
  ): Promise<PlayerRecord> {
    const sessionPlayers = this.players.get(sessionId) ?? [];
    if (sessionPlayers.some((p) => p.userId === userId)) {
      throw new AppError('INVALID_INPUT', 'Player is already in this session', 409);
    }
    if (sessionPlayers.some((p) => p.seat === seat)) {
      throw new AppError('INVALID_INPUT', 'Seat is already occupied', 409);
    }

    const player: PlayerRecord = {
      id: crypto.randomUUID(),
      sessionId,
      userId,
      username: this.usernames.get(userId) ?? username ?? 'Player',
      seat,
      joinedAt: new Date().toISOString(),
    };
    sessionPlayers.push(player);
    this.players.set(sessionId, sessionPlayers);
    return player;
  }

  async startSession(
    sessionId: string,
    state: unknown,
    currentPlayerId: string | null,
    turnDeadlineAt: Date | null,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'waiting') return; // idempotency guard
    session.status = 'active';
    session.state = state;
    session.currentPlayerId = currentPlayerId;
    session.turnDeadlineAt = turnDeadlineAt?.toISOString() ?? null;
    session.startedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
  }

  async applyMove(data: {
    sessionId: string;
    userId: string;
    move: unknown;
    expectedVersion: number;
    nextState: unknown;
    nextPlayerId: string | null;
    isGameOver: boolean;
    result: unknown | null;
    nextTurnDeadlineAt: Date | null;
  }): Promise<SessionWithPlayers> {
    const session = this.sessions.get(data.sessionId);
    if (!session) throw new Error('Session not found');

    if (session.stateVersion !== data.expectedVersion) {
      throw new AppError(
        'STALE_GAME_STATE',
        `State version conflict. Current version is ${session.stateVersion}, expected ${data.expectedVersion}`,
        409,
      );
    }

    const now = new Date().toISOString();
    session.state = data.nextState;
    session.stateVersion += 1;
    session.currentPlayerId = data.nextPlayerId;
    session.status = data.isGameOver ? 'completed' : 'active';
    session.result = data.result;
    session.turnDeadlineAt = data.isGameOver
      ? null
      : (data.nextTurnDeadlineAt?.toISOString() ?? null);
    session.completedAt = data.isGameOver ? now : null;
    session.updatedAt = now;

    const players = this.players.get(data.sessionId) ?? [];
    return { ...session, players };
  }

  async clearTurnDeadline(
    sessionId: string,
    expectedVersion: number,
  ): Promise<SessionWithPlayers | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.stateVersion !== expectedVersion) return null;
    session.turnDeadlineAt = null;
    session.updatedAt = new Date().toISOString();
    const players = this.players.get(sessionId) ?? [];
    return { ...session, players };
  }

  async findExpiredActiveSessions(now: Date, limit: number): Promise<string[]> {
    const nowMs = now.getTime();
    const expired = [...this.sessions.values()].filter(
      (s): s is SessionRecord & { turnDeadlineAt: string } =>
        s.status === 'active' &&
        s.turnDeadlineAt !== null &&
        Date.parse(s.turnDeadlineAt) <= nowMs,
    );
    expired.sort((a, b) => Date.parse(a.turnDeadlineAt) - Date.parse(b.turnDeadlineAt));
    return expired.slice(0, limit).map((s) => s.id);
  }

  async updateSessionResult(sessionId: string, result: unknown): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.result = result;
      session.updatedAt = new Date().toISOString();
    }
  }
}
