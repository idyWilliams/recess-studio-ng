import { and, eq } from 'drizzle-orm';

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
  }): Promise<SessionWithPlayers>;

  findSessionByPublicId(publicId: string): Promise<SessionWithPlayers | null>;
  findSessionById(id: string): Promise<SessionWithPlayers | null>;
  addPlayer(sessionId: string, userId: string, seat: string): Promise<PlayerRecord>;
  startSession(
    sessionId: string,
    state: unknown,
    currentPlayerId: string | null,
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
  }): Promise<SessionWithPlayers>;
}

export class PostgresSessionRepository implements SessionRepository {
  constructor(private db: Database) {}

  private async getPlayersForSession(sessionId: string): Promise<PlayerRecord[]> {
    const rows = await this.db
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
      .where(eq(gamePlayers.sessionId, sessionId));

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
  }): Promise<SessionWithPlayers> {
    const [insertedSession] = await this.db
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

    await this.db.insert(gamePlayers).values({
      sessionId: insertedSession.id,
      userId: data.creatorUserId,
      seat: data.creatorSeat,
    });

    const players = await this.getPlayersForSession(insertedSession.id);

    return {
      id: insertedSession.id,
      publicId: insertedSession.publicId,
      gameId: insertedSession.gameId,
      status: insertedSession.status,
      state: insertedSession.state,
      stateVersion: insertedSession.stateVersion,
      currentPlayerId: insertedSession.currentPlayerId,
      result: insertedSession.result,
      startedAt: insertedSession.startedAt?.toISOString() ?? null,
      completedAt: insertedSession.completedAt?.toISOString() ?? null,
      createdAt: insertedSession.createdAt.toISOString(),
      updatedAt: insertedSession.updatedAt.toISOString(),
      players,
    };
  }

  async findSessionByPublicId(publicId: string): Promise<SessionWithPlayers | null> {
    const [session] = await this.db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.publicId, publicId))
      .limit(1);

    if (!session) return null;

    const players = await this.getPlayersForSession(session.id);

    return {
      id: session.id,
      publicId: session.publicId,
      gameId: session.gameId,
      status: session.status,
      state: session.state,
      stateVersion: session.stateVersion,
      currentPlayerId: session.currentPlayerId,
      result: session.result,
      startedAt: session.startedAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      players,
    };
  }

  async findSessionById(id: string): Promise<SessionWithPlayers | null> {
    const [session] = await this.db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, id))
      .limit(1);

    if (!session) return null;

    const players = await this.getPlayersForSession(session.id);

    return {
      id: session.id,
      publicId: session.publicId,
      gameId: session.gameId,
      status: session.status,
      state: session.state,
      stateVersion: session.stateVersion,
      currentPlayerId: session.currentPlayerId,
      result: session.result,
      startedAt: session.startedAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      players,
    };
  }

  async addPlayer(
    sessionId: string,
    userId: string,
    seat: string,
  ): Promise<PlayerRecord> {
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
  }

  async startSession(
    sessionId: string,
    state: unknown,
    currentPlayerId: string | null,
  ): Promise<void> {
    await this.db
      .update(gameSessions)
      .set({
        status: 'active',
        state: state as Record<string, unknown>,
        currentPlayerId,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gameSessions.id, sessionId));
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
  }): Promise<SessionWithPlayers> {
    const newVersion = data.expectedVersion + 1;
    const now = new Date();

    const [updated] = await this.db
      .update(gameSessions)
      .set({
        state: data.nextState as Record<string, unknown>,
        stateVersion: newVersion,
        currentPlayerId: data.nextPlayerId,
        status: data.isGameOver ? 'completed' : 'active',
        result: data.result as Record<string, unknown> | null,
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
      const [current] = await this.db
        .select({ stateVersion: gameSessions.stateVersion })
        .from(gameSessions)
        .where(eq(gameSessions.id, data.sessionId));

      throw new AppError(
        'STALE_GAME_STATE',
        `State version conflict. Current version is ${current?.stateVersion ?? 'unknown'}, expected ${data.expectedVersion}`,
        409,
      );
    }

    await this.db.insert(gameMoves).values({
      sessionId: data.sessionId,
      userId: data.userId,
      move: data.move as Record<string, unknown>,
      stateVersionAfter: newVersion,
    });

    const players = await this.getPlayersForSession(data.sessionId);

    return {
      id: updated.id,
      publicId: updated.publicId,
      gameId: updated.gameId,
      status: updated.status,
      state: updated.state,
      stateVersion: updated.stateVersion,
      currentPlayerId: updated.currentPlayerId,
      result: updated.result,
      startedAt: updated.startedAt?.toISOString() ?? null,
      completedAt: updated.completedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      players,
    };
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
      username: this.usernames.get(data.creatorUserId) ?? 'Player',
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
  ): Promise<PlayerRecord> {
    const sessionPlayers = this.players.get(sessionId) ?? [];
    const player: PlayerRecord = {
      id: crypto.randomUUID(),
      sessionId,
      userId,
      username: this.usernames.get(userId) ?? 'Player',
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
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    session.status = 'active';
    session.state = state;
    session.currentPlayerId = currentPlayerId;
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
    session.completedAt = data.isGameOver ? now : null;
    session.updatedAt = now;

    const players = this.players.get(data.sessionId) ?? [];
    return { ...session, players };
  }
}
