import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, count, eq, isNotNull, lte } from 'drizzle-orm';

import {
  createDatabaseClient,
  gameMoves,
  gamePlayers,
  gameSessions,
  games,
  type Database,
} from '@recess/database';

import { buildApp } from './app.js';
import { GameRegistry } from './games/game-registry.js';
import {
  IdentityService,
  PostgresIdentityRepository,
} from './identity/identity-service.js';
import { PostgresSessionRepository } from './sessions/session-repository.js';
import { SessionService, TURN_DURATION_MS } from './sessions/session-service.js';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://recess:recess@localhost:5432/recess_test';

/** Controllable clock so deadline behaviour is deterministic against the real database. */
function createClock(start: Date) {
  let current = new Date(start.getTime());
  return {
    now: () => new Date(current.getTime()),
    advance: (ms: number) => {
      current = new Date(current.getTime() + ms);
    },
  };
}

describe('PostgreSQL Game Sessions & Turn Concurrency Integration', () => {
  let db: Database;
  let closeClient: () => Promise<void>;
  let canConnect = false;

  beforeAll(async () => {
    try {
      const clientBundle = createDatabaseClient(TEST_DATABASE_URL);
      db = clientBundle.db;
      closeClient = async () => {
        await clientBundle.client.end();
      };
      // Probe query and ensure games catalog has demo game
      const gameRegistry = new GameRegistry();
      await gameRegistry.syncCatalogToDatabase(db);
      canConnect = true;
    } catch {
      canConnect = false;
    }
  });

  afterAll(async () => {
    if (closeClient) {
      await closeClient();
    }
  });

  it('verifies game definition exists in PostgreSQL games catalog', async () => {
    if (!canConnect) return;

    const [catalogGame] = await db
      .select()
      .from(games)
      .where(eq(games.id, 'take-turn-demo'));

    expect(catalogGame).toBeDefined();
    expect(catalogGame?.name).toBe('Take Turn Demo');
    expect(catalogGame?.isActive).toBe(true);

    const [wordBattleGame] = await db
      .select()
      .from(games)
      .where(eq(games.id, 'word-battle'));

    expect(wordBattleGame).toBeDefined();
    expect(wordBattleGame?.name).toBe('Word Battle');
    expect(wordBattleGame?.minPlayers).toBe(2);
    expect(wordBattleGame?.maxPlayers).toBe(2);
    expect(wordBattleGame?.isActive).toBe(true);
  });

  it('persists session creation and player joining in PostgreSQL', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3002,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    const identityService = new IdentityService(new PostgresIdentityRepository(db));
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
    );
    const app = buildApp(env, identityService, sessionService, gameRegistry);

    const tag = Date.now().toString(36);
    const p1Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `P1_${tag}` },
    });
    const p1 = p1Res.json();

    const p2Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `P2_${tag}` },
    });
    const p2 = p2Res.json();

    // Create session in PostgreSQL
    const createRes = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { gameId: 'take-turn-demo' },
    });

    expect(createRes.statusCode).toBe(201);
    const session = createRes.json();

    // Verify row directly in PostgreSQL game_sessions table
    const [dbSession] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, session.id));
    expect(dbSession).toBeDefined();
    expect(dbSession?.publicId).toBe(session.publicId);
    expect(dbSession?.status).toBe('waiting');

    // Verify creator seat in PostgreSQL game_players table
    const [creatorPlayer] = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.sessionId, session.id));
    expect(creatorPlayer).toBeDefined();
    expect(creatorPlayer?.userId).toBe(p1.user.id);
    expect(creatorPlayer?.seat).toBe('0');

    // Player 2 joins in PostgreSQL
    const joinRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });

    expect(joinRes.statusCode).toBe(200);
    const active = joinRes.json();
    expect(active.status).toBe('active');
    expect(active.currentPlayerId).toBe(p1.user.id);

    // Verify status updated in PostgreSQL
    const [updatedDbSession] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, session.id));
    expect(updatedDbSession?.status).toBe('active');

    // Play move 1 (P1 plays 2 points)
    const moveRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/moves`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { move: { points: 2 }, expectedStateVersion: 0 },
    });

    expect(moveRes.statusCode).toBe(200);
    expect(moveRes.json().stateVersion).toBe(1);

    // Verify move persisted to PostgreSQL game_moves table
    const [dbMove] = await db
      .select()
      .from(gameMoves)
      .where(eq(gameMoves.sessionId, session.id));
    expect(dbMove).toBeDefined();
    expect(dbMove?.userId).toBe(p1.user.id);
    expect(dbMove?.stateVersionAfter).toBe(1);

    await app.close();
  });

  it('rejects conflicting concurrent moves via PostgreSQL optimistic locking', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3003,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    const identityService = new IdentityService(new PostgresIdentityRepository(db));
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
    );
    const app = buildApp(env, identityService, sessionService, gameRegistry);

    const tag = `${Date.now().toString(36)}_cc`;
    const p1Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `P1_${tag}` },
    });
    const p1 = p1Res.json();

    const p2Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `P2_${tag}` },
    });
    const p2 = p2Res.json();

    const createRes = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { gameId: 'take-turn-demo' },
    });
    const { publicId } = createRes.json();

    await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });

    // Fire TWO concurrent move requests with the EXACT same expectedStateVersion (0)
    const [resA, resB] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { points: 2 }, expectedStateVersion: 0 },
      }),
      app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { points: 1 }, expectedStateVersion: 0 },
      }),
    ]);

    // Exactly one move must succeed with 200, and the other must be rejected with 409 STALE_GAME_STATE
    const statusCodes = [resA.statusCode, resB.statusCode].sort();
    expect(statusCodes).toEqual([200, 409]);

    const failedRes = resA.statusCode === 409 ? resA : resB;
    expect(failedRes.json().code).toBe('STALE_GAME_STATE');

    await app.close();
  });

  it('rejects concurrent join attempts on the last seat via PostgreSQL unique constraints', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3005,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    const identityService = new IdentityService(new PostgresIdentityRepository(db));
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
    );
    const app = buildApp(env, identityService, sessionService, gameRegistry);

    const tag = `${Date.now().toString(36)}_cj`;
    const p1 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `C1_${tag}` },
      })
    ).json();
    const p2 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `C2_${tag}` },
      })
    ).json();
    const p3 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `C3_${tag}` },
      })
    ).json();

    const session = (
      await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'take-turn-demo' },
      })
    ).json();

    // Two players (P2 and P3) simultaneously race to join seat 1 of a 2-player max game
    const [join2, join3] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      }),
      app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/join`,
        headers: { authorization: `Bearer ${p3.sessionToken}` },
      }),
    ]);

    const codes = [join2.statusCode, join3.statusCode].sort();
    // Exactly one joins (200), other is rejected (400 or 409)
    expect(codes[0]).toBe(200);
    expect([400, 409]).toContain(codes[1]);

    await app.close();
  });

  it('preserves session state and move history across API server restarts', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3004,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    const identityService = new IdentityService(new PostgresIdentityRepository(db));
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
    );
    const app = buildApp(env, identityService, sessionService, gameRegistry);

    const tag = `${Date.now().toString(36)}_rst`;
    const p1Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `P1_${tag}` },
    });
    const p1 = p1Res.json();

    const p2Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `P2_${tag}` },
    });
    const p2 = p2Res.json();

    const createRes = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { gameId: 'take-turn-demo' },
    });
    const { publicId } = createRes.json();

    await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });

    await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { move: { points: 3 }, expectedStateVersion: 0 },
    });

    // SIMULATE API RESTART: shut down app instance completely
    await app.close();

    // Construct fresh app instance
    const freshApp = buildApp(
      env,
      new IdentityService(new PostgresIdentityRepository(db)),
      new SessionService(new PostgresSessionRepository(db), gameRegistry),
      gameRegistry,
    );

    // Fetch session by publicId from PostgreSQL
    const getRes = await freshApp.inject({
      method: 'GET',
      url: `/game-sessions/${publicId}`,
    });

    expect(getRes.statusCode).toBe(200);
    const body = getRes.json();
    expect(body.status).toBe('active');
    expect(body.stateVersion).toBe(1);
    expect(body.players.length).toBe(2);
    expect(body.currentPlayerId).toBe(p2.user.id);

    await freshApp.close();
  });

  it('persists turn deadlines across API server restarts without resetting them', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3006,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    const identityService = new IdentityService(new PostgresIdentityRepository(db));
    const gameRegistry = new GameRegistry();
    const app = buildApp(
      env,
      identityService,
      new SessionService(new PostgresSessionRepository(db), gameRegistry),
      gameRegistry,
    );

    const tag = `${Date.now().toString(36)}_dl`;
    const p1 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `D1_${tag}` },
      })
    ).json();
    const p2 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `D2_${tag}` },
      })
    ).json();

    const session = (
      await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      })
    ).json();

    const joined = (
      await app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      })
    ).json();

    // The real-clock server established a deadline about 15 seconds ahead
    const deadlineAtStart: string = joined.turnDeadlineAt;
    expect(typeof deadlineAtStart).toBe('string');
    const aheadMs = Date.parse(deadlineAtStart) - Date.now();
    expect(aheadMs).toBeGreaterThan(10_000);
    expect(aheadMs).toBeLessThanOrEqual(15_500);

    // Persisted in PostgreSQL
    const [dbRow] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, session.id));
    expect(dbRow?.turnDeadlineAt?.toISOString()).toBe(deadlineAtStart);

    // SIMULATE API RESTART: fresh app, service, and repository instances
    await app.close();
    const freshApp = buildApp(
      env,
      new IdentityService(new PostgresIdentityRepository(db)),
      new SessionService(new PostgresSessionRepository(db), gameRegistry),
      gameRegistry,
    );

    const readAfterRestart = await freshApp.inject({
      method: 'GET',
      url: `/game-sessions/${session.publicId}`,
    });
    expect(readAfterRestart.statusCode).toBe(200);
    // The deadline is neither lost nor reset by the restart
    expect(readAfterRestart.json().turnDeadlineAt).toBe(deadlineAtStart);
    expect(readAfterRestart.json().stateVersion).toBe(0);

    await freshApp.close();
  });

  it('applies a timeout exactly once under concurrent expire-turn requests', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3007,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    // Far-future fake clock: sessions created here are never "expired" for a
    // real-clock process that might share this database (e.g. a dev server),
    // while the injected service clock drives the deadline deterministically.
    const clock = createClock(new Date('2030-01-01T10:00:00.000Z'));
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
      undefined,
      clock.now,
    );
    const app = buildApp(
      env,
      new IdentityService(new PostgresIdentityRepository(db)),
      sessionService,
      gameRegistry,
    );

    const tag = `${Date.now().toString(36)}_cc`;
    const p1 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `X1_${tag}` },
      })
    ).json();
    const p2 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `X2_${tag}` },
      })
    ).json();

    const session = (
      await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      })
    ).json();

    await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });

    // Advance the server clock to exactly the stored deadline, then race two
    // participants asking for reconciliation of the same turn.
    clock.advance(TURN_DURATION_MS);

    const [resA, resB] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      }),
      app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      }),
    ]);

    // At most one request reports success; a loser is told to discard its stale
    // request (the authoritative outcome is already persisted)
    expect(
      [resA.statusCode, resB.statusCode].filter((c) => c === 200).length,
    ).toBeLessThanOrEqual(1);
    const loser = resA.statusCode === 409 ? resA : resB;
    if (loser.statusCode === 409) {
      expect(loser.json().code).toBe('STALE_GAME_STATE');
    }

    // Authoritative state advanced exactly once, with a timeout penalty
    const after = await app.inject({
      method: 'GET',
      url: `/game-sessions/${session.publicId}`,
    });
    const state = after.json();
    expect(state.stateVersion).toBe(1);
    expect(state.currentPlayerId).toBe(p2.user.id);
    expect(state.state.lives[p1.user.id]).toBe(2);
    expect(state.state.history).toHaveLength(1);
    expect(state.state.history[0].penalty).toBe('TIMEOUT');

    // Exactly ONE persisted move for the turn — the timeout, authored by the
    // timed-out player; the database unique index makes a second write impossible
    const moveRows = await db
      .select()
      .from(gameMoves)
      .where(eq(gameMoves.sessionId, session.id));
    expect(moveRows).toHaveLength(1);
    expect(moveRows[0]?.stateVersionAfter).toBe(1);
    expect(moveRows[0]?.move).toEqual({ type: 'timeout' });
    expect(moveRows[0]?.userId).toBe(p1.user.id);

    await app.close();
  });

  it('never lets a concurrent move and timeout both apply to the same turn', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3008,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    // Far-future fake clock — see the concurrent expire-turn test above.
    const clock = createClock(new Date('2030-01-02T10:00:00.000Z'));
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
      { isValidWord: async () => true },
      clock.now,
    );
    const app = buildApp(
      env,
      new IdentityService(new PostgresIdentityRepository(db)),
      sessionService,
      gameRegistry,
    );

    const tag = `${Date.now().toString(36)}_mt`;
    const p1 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `M1_${tag}` },
      })
    ).json();
    const p2 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `M2_${tag}` },
      })
    ).json();

    const session = (
      await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      })
    ).json();

    await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });

    // The deadline has passed, so BOTH requests race to consume the same turn:
    // the expire request asks for reconciliation, while the late move must be
    // stopped by its own reconciliation step.
    clock.advance(TURN_DURATION_MS);

    const [expireRes, moveRes] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      }),
      app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word: 'zzzzzzzzzz' }, expectedStateVersion: 0 },
      }),
    ]);

    // A late move can never be scored or steal the turn
    expect(moveRes.statusCode).toBe(409);
    expect([200, 409]).toContain(expireRes.statusCode);

    // Exactly one transition happened: the TIMEOUT — never the late move
    const after = await app.inject({
      method: 'GET',
      url: `/game-sessions/${session.publicId}`,
    });
    const state = after.json();
    expect(state.stateVersion).toBe(1);
    expect(state.currentPlayerId).toBe(p2.user.id);
    expect(state.state.lives[p1.user.id]).toBe(2);
    expect(state.state.scores[p1.user.id]).toBe(0);
    expect(state.state.history).toHaveLength(1);
    expect(state.state.history[0].penalty).toBe('TIMEOUT');

    const moveRows = await db
      .select()
      .from(gameMoves)
      .where(eq(gameMoves.sessionId, session.id));
    expect(moveRows).toHaveLength(1);
    expect(moveRows[0]?.move).toEqual({ type: 'timeout' });

    // The match continues normally against the advanced version
    const p2Move = await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/moves`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
      payload: { move: { word: 'zzzzzzzzzz' }, expectedStateVersion: 1 },
    });
    expect(p2Move.statusCode).toBe(200);
    expect(p2Move.json().stateVersion).toBe(2);

    await app.close();
  });

  it('times out each expired turn exactly once across multiple service instances', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3009,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    // Far-future fake clock — see the concurrent expire-turn test above.
    const clock = createClock(new Date('2030-01-03T10:00:00.000Z'));
    const gameRegistry = new GameRegistry();

    // Two independent service+repository instances, as two API servers would be
    const serviceA = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
      undefined,
      clock.now,
    );
    const serviceB = new SessionService(
      new PostgresSessionRepository(db),
      gameRegistry,
      undefined,
      clock.now,
    );

    const app = buildApp(
      env,
      new IdentityService(new PostgresIdentityRepository(db)),
      serviceA,
      gameRegistry,
    );

    const tag = `${Date.now().toString(36)}_ms`;
    const p1 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `S1_${tag}` },
      })
    ).json();
    const p2 = (
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: `S2_${tag}` },
      })
    ).json();

    const session = (
      await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      })
    ).json();

    await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });

    clock.advance(TURN_DURATION_MS);

    // Sweeps are global to the database, and the shared test database may hold
    // expired sessions from earlier runs. Size the batch to everything that is
    // currently expired (oldest first) so this session is certainly included —
    // the batch stays bounded and the unit suite covers the batch-limit itself.
    const [expiredRow] = await db
      .select({ value: count() })
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.status, 'active'),
          isNotNull(gameSessions.turnDeadlineAt),
          lte(gameSessions.turnDeadlineAt, clock.now()),
        ),
      );
    const sweepLimit = (expiredRow?.value ?? 0) + 10;

    // Both instances sweep the same expired turn concurrently
    const [sweepA, sweepB] = await Promise.all([
      serviceA.reconcileExpiredTurns(sweepLimit),
      serviceB.reconcileExpiredTurns(sweepLimit),
    ]);
    expect(sweepA.reconciled + sweepB.reconciled).toBeGreaterThanOrEqual(1);

    // Exactly one authoritative transition was persisted for this session
    const after = await app.inject({
      method: 'GET',
      url: `/game-sessions/${session.publicId}`,
    });
    const state = after.json();
    expect(state.stateVersion).toBe(1);
    expect(state.state.lives[p1.user.id]).toBe(2);
    expect(state.state.history).toHaveLength(1);
    expect(state.state.history[0].penalty).toBe('TIMEOUT');

    const moveRows = await db
      .select()
      .from(gameMoves)
      .where(eq(gameMoves.sessionId, session.id));
    expect(moveRows).toHaveLength(1);
    expect(moveRows[0]?.move).toEqual({ type: 'timeout' });

    // Re-sweeping changes nothing further: the new turn's deadline is in the
    // future, and the consumed deadline cannot advance the state again
    await Promise.all([
      serviceA.reconcileExpiredTurns(sweepLimit),
      serviceB.reconcileExpiredTurns(sweepLimit),
    ]);
    const reread = await app.inject({
      method: 'GET',
      url: `/game-sessions/${session.publicId}`,
    });
    expect(reread.json().stateVersion).toBe(1);
    const moveRowsAfter = await db
      .select()
      .from(gameMoves)
      .where(eq(gameMoves.sessionId, session.id));
    expect(moveRowsAfter).toHaveLength(1);

    await app.close();
  });
});
