import { describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import { GameRegistry } from './games/game-registry.js';
import type { WordValidator } from './games/word-validator.js';
import { IdentityService } from './identity/identity-service.js';
import { InMemorySessionRepository } from './sessions/session-repository.js';
import { SessionService } from './sessions/session-service.js';

describe('Game Sessions & Turn Engine (Unit)', () => {
  const env = { PORT: 3000, NODE_ENV: 'test' as const };

  async function setupTestApp(wordValidator?: WordValidator) {
    const identityService = new IdentityService();
    const sessionRepo = new InMemorySessionRepository();
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(sessionRepo, gameRegistry, wordValidator);
    const app = buildApp(env, identityService, sessionService, gameRegistry);

    // Register Player 1
    const p1Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: 'PlayerOne' },
    });
    const p1 = p1Res.json();

    // Register Player 2
    const p2Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: 'PlayerTwo' },
    });
    const p2 = p2Res.json();

    // Register Player 3 (spectator/non-participant)
    const p3Res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: 'PlayerThree' },
    });
    const p3 = p3Res.json();

    sessionRepo.setUsername(p1.user.id, 'PlayerOne');
    sessionRepo.setUsername(p2.user.id, 'PlayerTwo');
    sessionRepo.setUsername(p3.user.id, 'PlayerThree');

    return { app, p1, p2, p3 };
  }

  it('requires authentication to create a session', async () => {
    const { app } = await setupTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      payload: { gameId: 'take-turn-demo' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('creates a session with creator as seat 0 in waiting status', async () => {
    const { app, p1 } = await setupTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { gameId: 'take-turn-demo' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.publicId).toBeDefined();
    expect(body.status).toBe('waiting');
    expect(body.stateVersion).toBe(0);
    expect(body.players.length).toBe(1);
    expect(body.players[0].userId).toBe(p1.user.id);
    expect(body.players[0].seat).toBe('0');
  });

  it('starts game automatically when minimum players join', async () => {
    const { app, p1, p2 } = await setupTestApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { gameId: 'take-turn-demo' },
    });
    const session = createRes.json();

    const joinRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });

    expect(joinRes.statusCode).toBe(200);
    const active = joinRes.json();
    expect(active.status).toBe('active');
    expect(active.players.length).toBe(2);
    expect(active.currentPlayerId).toBe(p1.user.id);
  });

  it('rejects duplicate join from same user', async () => {
    const { app, p1 } = await setupTestApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { gameId: 'take-turn-demo' },
    });
    const session = createRes.json();

    const duplicateJoinRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${session.publicId}/join`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
    });

    expect(duplicateJoinRes.statusCode).toBe(409);
    expect(duplicateJoinRes.json().code).toBe('INVALID_INPUT');
  });

  it('rejects moves from users who are not participants', async () => {
    const { app, p1, p2, p3 } = await setupTestApp();

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

    const moveRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p3.sessionToken}` },
      payload: { move: { points: 2 }, expectedStateVersion: 0 },
    });

    expect(moveRes.statusCode).toBe(403);
    expect(moveRes.json().code).toBe('PLAYER_NOT_IN_GAME');
  });

  it('rejects moves when submitted out of turn', async () => {
    const { app, p1, p2 } = await setupTestApp();

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

    // P2 tries to move, but it is P1's turn
    const moveRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
      payload: { move: { points: 2 }, expectedStateVersion: 0 },
    });

    expect(moveRes.statusCode).toBe(400);
    expect(moveRes.json().code).toBe('NOT_YOUR_TURN');
  });

  it('rejects moves with stale or conflicting state version', async () => {
    const { app, p1, p2 } = await setupTestApp();

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

    // Expected version is 0, but client sends 99
    const moveRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { move: { points: 2 }, expectedStateVersion: 99 },
    });

    expect(moveRes.statusCode).toBe(409);
    expect(moveRes.json().code).toBe('STALE_GAME_STATE');
  });

  it('rejects illegal move payload violating game rules', async () => {
    const { app, p1, p2 } = await setupTestApp();

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

    // TakeTurnDemo rules require points between 1 and 3
    const moveRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { move: { points: 99 }, expectedStateVersion: 0 },
    });

    expect(moveRes.statusCode).toBe(400);
    expect(moveRes.json().code).toBe('INVALID_MOVE');
  });

  it('executes valid moves through to game completion', async () => {
    const { app, p1, p2 } = await setupTestApp();

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

    // Turn 1: P1 plays 2 points
    const m1 = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { move: { points: 2 }, expectedStateVersion: 0 },
    });
    expect(m1.statusCode).toBe(200);
    expect(m1.json().stateVersion).toBe(1);
    expect(m1.json().currentPlayerId).toBe(p2.user.id);

    // Turn 2: P2 plays 3 points
    const m2 = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
      payload: { move: { points: 3 }, expectedStateVersion: 1 },
    });
    expect(m2.statusCode).toBe(200);
    expect(m2.json().stateVersion).toBe(2);
    expect(m2.json().currentPlayerId).toBe(p1.user.id);

    // Turn 3: P1 plays 1 point
    const m3 = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { move: { points: 1 }, expectedStateVersion: 2 },
    });
    expect(m3.statusCode).toBe(200);

    // Turn 4: P2 plays 2 points (game completes)
    const m4 = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
      payload: { move: { points: 2 }, expectedStateVersion: 3 },
    });
    expect(m4.statusCode).toBe(200);
    const finished = m4.json();
    expect(finished.status).toBe('completed');
    expect(finished.result).toBeDefined();
    expect(finished.result.winnerId).toBe(p2.user.id);

    // Move on completed game must be rejected
    const mAfter = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/moves`,
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { move: { points: 1 }, expectedStateVersion: 4 },
    });
    expect(mAfter.statusCode).toBe(400);
    expect(mAfter.json().code).toBe('GAME_NOT_ACTIVE');
  });

  describe('Word Battle session orchestration', () => {
    it('creates and starts a word-battle session when 2 players join', async () => {
      const { app, p1, p2 } = await setupTestApp();

      const createRes = await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      });
      expect(createRes.statusCode).toBe(201);
      const session = createRes.json();
      expect(session.gameId).toBe('word-battle');
      expect(session.status).toBe('waiting');

      const joinRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${session.publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      });
      expect(joinRes.statusCode).toBe(200);
      const active = joinRes.json();
      expect(active.status).toBe('active');
      expect(active.currentPlayerId).toBe(p1.user.id);
      expect(active.state.scores[p1.user.id]).toBe(0);
      expect(active.state.scores[p2.user.id]).toBe(0);
    });

    it('validates moves through dictionary validator and updates game state', async () => {
      const mockValidator: WordValidator = {
        isValidWord: async (word: string) => ['apple', 'banana'].includes(word),
      };
      const { app, p1, p2 } = await setupTestApp(mockValidator);

      const createRes = await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      });
      const { publicId } = createRes.json();

      await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      });

      // Submit valid word 'apple' (5 letters -> 5 points)
      const moveRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word: 'apple' }, expectedStateVersion: 0 },
      });

      expect(moveRes.statusCode).toBe(200);
      const updated = moveRes.json();
      expect(updated.stateVersion).toBe(1);
      expect(updated.currentPlayerId).toBe(p2.user.id);
      expect(updated.state.scores[p1.user.id]).toBe(5);
      expect(updated.state.history).toEqual([
        { playerId: p1.user.id, word: 'apple', score: 5 },
      ]);
    });

    it('rejects unrecognized word with INVALID_MOVE without advancing turn', async () => {
      const mockValidator: WordValidator = {
        isValidWord: async () => false,
      };
      const { app, p1, p2 } = await setupTestApp(mockValidator);

      const createRes = await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      });
      const { publicId } = createRes.json();

      await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      });

      const moveRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word: 'invalidwordxyz' }, expectedStateVersion: 0 },
      });

      expect(moveRes.statusCode).toBe(400);
      expect(moveRes.json().code).toBe('INVALID_MOVE');

      // Verify session state was not modified and turn did not change
      const getRes = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
      });
      const current = getRes.json();
      expect(current.stateVersion).toBe(0);
      expect(current.currentPlayerId).toBe(p1.user.id);
    });
  });
});
