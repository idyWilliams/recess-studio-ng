import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

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
import { SessionService } from './sessions/session-service.js';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://recess:recess@localhost:5432/recess_test';

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
});
