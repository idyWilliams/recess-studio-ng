import { describe, expect, it } from 'vitest';

import type { FastifyInstance } from 'fastify';

import type { BoardCoordinate, BoardTile } from '@recess/game-word-battle';

import { buildApp } from './app.js';
import { demoGame } from './games/demo-game.js';
import { GameRegistry } from './games/game-registry.js';
import type { WordValidator } from './games/word-validator.js';
import { IdentityService } from './identity/identity-service.js';
import { InMemorySessionRepository } from './sessions/session-repository.js';
import { SessionService, TURN_DURATION_MS } from './sessions/session-service.js';

/** Controllable clock for deterministic turn-deadline tests (no wall-clock dependence). */
function createTestClock(start: Date) {
  let current = new Date(start.getTime());
  return {
    now: () => new Date(current.getTime()),
    advance: (ms: number) => {
      current = new Date(current.getTime() + ms);
    },
  };
}

/**
 * Walks an authoritative board to find any adjacent, non-repeating tile path of at
 * least 3 tiles, returning the word those tiles spell along with the path. Used to
 * derive a genuinely formable word for API-level move tests (the API generates its
 * own board from a time-based seed, so tests cannot hardcode a word).
 */
function findFormableWordOnBoard(board: BoardTile[][]): {
  word: string;
  path: BoardCoordinate[];
} {
  const size = board.length;
  const directions = [-1, 0, 1];

  function dfs(
    row: number,
    col: number,
    visited: Set<string>,
    path: BoardCoordinate[],
  ): BoardCoordinate[] | null {
    if (path.length >= 3) return path;
    for (const dr of directions) {
      for (const dc of directions) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        visited.add(key);
        path.push({ row: nr, col: nc });
        const result = dfs(nr, nc, visited, path);
        if (result) return result;
        path.pop();
        visited.delete(key);
      }
    }
    return null;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const visited = new Set<string>([`${r},${c}`]);
      const path: BoardCoordinate[] = [{ row: r, col: c }];
      const found = dfs(r, c, visited, path);
      if (found) {
        return {
          word: found.map((p) => board[p.row]![p.col]!.letter.toLowerCase()).join(''),
          path: found,
        };
      }
    }
  }

  throw new Error('Expected a 4x4 board to contain a formable word path');
}

describe('Game Sessions & Turn Engine (Unit)', () => {
  const env = { PORT: 3000, NODE_ENV: 'test' as const };

  async function setupTestApp(wordValidator?: WordValidator, now?: () => Date) {
    const identityService = new IdentityService();
    const sessionRepo = new InMemorySessionRepository();
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(
      sessionRepo,
      gameRegistry,
      wordValidator,
      now,
    );
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

    return { app, p1, p2, p3, sessionService, sessionRepo };
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
        // Accept any word as dictionary-valid; this test exercises the move pipeline,
        // not the dictionary itself.
        isValidWord: async () => true,
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

      // Read the authoritative board and derive a word that IS formable on it.
      const getRes = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
      });
      const { word, path } = findFormableWordOnBoard(getRes.json().state.board);

      const moveRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word, path }, expectedStateVersion: 0 },
      });

      expect(moveRes.statusCode).toBe(200);
      const updated = moveRes.json();
      expect(updated.stateVersion).toBe(1);
      expect(updated.currentPlayerId).toBe(p2.user.id);
      expect(updated.state.scores[p1.user.id]).toBe(word.length);
      expect(updated.state.history[0]).toMatchObject({
        playerId: p1.user.id,
        word,
        score: word.length,
      });
    });

    it('penalises with ILLEGAL_PATH when a dictionary-valid word cannot be formed on the board', async () => {
      const mockValidator: WordValidator = {
        // Even a dictionary-valid word must be rejected if it is not formable on the board.
        isValidWord: async () => true,
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

      // Ten Z's can never be formed on a board that is vowel-balanced (4-7 vowels).
      const moveRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word: 'zzzzzzzzzz' }, expectedStateVersion: 0 },
      });

      expect(moveRes.statusCode).toBe(200);
      const updated = moveRes.json();

      // Penalised, not scored: life lost, no points, board unchanged, turn passes.
      expect(updated.stateVersion).toBe(1);
      expect(updated.currentPlayerId).toBe(p2.user.id);
      expect(updated.state.scores[p1.user.id]).toBe(0);
      expect(updated.state.lives[p1.user.id]).toBe(2);
      expect(updated.state.usedWords).toEqual([]);
      expect(updated.state.history[0]).toMatchObject({
        playerId: p1.user.id,
        word: 'zzzzzzzzzz',
        score: 0,
        penalty: 'ILLEGAL_PATH',
      });
    });

    it('penalises player with life loss when word is not in dictionary', async () => {
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

      // Move succeeds (200): the game core records the penalty and advances the turn.
      expect(moveRes.statusCode).toBe(200);
      const updated = moveRes.json();

      // State version must have advanced
      expect(updated.stateVersion).toBe(1);

      // Turn must have advanced to p2
      expect(updated.currentPlayerId).toBe(p2.user.id);

      // P1 must have lost a life
      expect(updated.state.lives[p1.user.id]).toBe(2);

      // P1 must not have gained score
      expect(updated.state.scores[p1.user.id]).toBe(0);

      // History entry must record the penalty
      expect(updated.state.history).toHaveLength(1);
      expect(updated.state.history[0].penalty).toBe('INVALID_DICTIONARY');
    });

    it('rejects move with 400 when word field is missing or empty', async () => {
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

      // Empty word string — must be rejected before reaching game core
      const moveRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word: '   ' }, expectedStateVersion: 0 },
      });

      expect(moveRes.statusCode).toBe(400);
      expect(moveRes.json().code).toBe('INVALID_MOVE');

      // State must not have changed
      const getRes = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
      });
      expect(getRes.json().stateVersion).toBe(0);
    });

    it('expire-turn applies the timeout penalty only after the stored deadline, exactly once', async () => {
      const start = new Date('2026-05-01T12:00:00.000Z');
      const clock = createTestClock(start);
      const { app, p1, p2 } = await setupTestApp(undefined, clock.now);

      const createRes = await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'word-battle' },
      });
      const { publicId } = createRes.json();

      const joinRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      });

      // The server establishes the 15-second deadline when the turn becomes active
      expect(joinRes.json().turnDeadlineAt).toBe(
        new Date(start.getTime() + TURN_DURATION_MS).toISOString(),
      );

      // Before the deadline, even a participant asking for reconciliation cannot
      // cause a penalty — the endpoint is server-verified, not client-authorized.
      const early = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      });
      expect(early.statusCode).toBe(409);
      expect(early.json().code).toBe('TURN_NOT_EXPIRED');

      // The rejected request leaves state completely untouched
      const before = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(before.json().stateVersion).toBe(0);
      expect(before.json().state.lives[p1.user.id]).toBe(3);

      // Advance the server clock to exactly the stored deadline
      clock.advance(TURN_DURATION_MS);

      const expireRes = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      });

      expect(expireRes.statusCode).toBe(200);
      const after = expireRes.json();

      // Turn advances, version increments
      expect(after.stateVersion).toBe(1);
      expect(after.currentPlayerId).toBe(p2.user.id);

      // P1 loses a life due to timeout
      expect(after.state.lives[p1.user.id]).toBe(2);

      // History records the timeout
      expect(after.state.history).toHaveLength(1);
      expect(after.state.history[0].penalty).toBe('TIMEOUT');

      // The next turn receives a fresh deadline measured from the server clock
      expect(after.turnDeadlineAt).toBe(
        new Date(start.getTime() + 2 * TURN_DURATION_MS).toISOString(),
      );

      // Replaying the same request is rejected as stale (idempotence signal)
      const replay = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      });
      expect(replay.statusCode).toBe(409);
      expect(replay.json().code).toBe('STALE_GAME_STATE');
    });

    it('expire-turn returns 409 STALE_GAME_STATE when state already advanced', async () => {
      const mockValidator: WordValidator = {
        isValidWord: async (word) => word === 'apple',
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

      // P1 submits a valid word (advances state from v0 to v1)
      await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word: 'apple' }, expectedStateVersion: 0 },
      });

      // Stale expire-turn (still references v0 — state already at v1)
      const staleExpire = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      });

      // Must return 409 so client can safely discard the stale timeout
      expect(staleExpire.statusCode).toBe(409);
      expect(staleExpire.json().code).toBe('STALE_GAME_STATE');
    });
  });

  const start = new Date('2026-06-01T09:00:00.000Z');

  async function startWordBattle(
    app: FastifyInstance,
    p1: { sessionToken: string },
    p2: { sessionToken: string },
  ) {
    const createRes = await app.inject({
      method: 'POST',
      url: '/game-sessions',
      headers: { authorization: `Bearer ${p1.sessionToken}` },
      payload: { gameId: 'word-battle' },
    });
    const { publicId } = createRes.json();
    const joinRes = await app.inject({
      method: 'POST',
      url: `/game-sessions/${publicId}/join`,
      headers: { authorization: `Bearer ${p2.sessionToken}` },
    });
    return { publicId, joined: joinRes.json() };
  }

  describe('Authoritative turn deadlines & timeout processing (Stage 2)', () => {

    it('word-battle sessions receive a server deadline on start; games without timeout support never do', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2 } = await setupTestApp(undefined, clock.now);

      const { joined } = await startWordBattle(app, p1, p2);
      expect(joined.status).toBe('active');
      expect(joined.turnDeadlineAt).toBe(
        new Date(start.getTime() + TURN_DURATION_MS).toISOString(),
      );

      // The take-turn demo rejects timeout moves (capability probe), so its sessions
      // must never receive a deadline — a game-agnostic sweeper would otherwise try
      // to apply an unsupported move.
      const demoCreate = await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'take-turn-demo' },
      });
      const demoJoin = await app.inject({
        method: 'POST',
        url: `/game-sessions/${demoCreate.json().publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      });
      expect(demoJoin.json().status).toBe('active');
      expect(demoJoin.json().turnDeadlineAt).toBeNull();
    });

    it('the deadline is never reset by reads, reconnects, or repeated polling', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2 } = await setupTestApp(undefined, clock.now);
      const { publicId, joined } = await startWordBattle(app, p1, p2);

      const fixedDeadline = new Date(start.getTime() + TURN_DURATION_MS).toISOString();
      expect(joined.turnDeadlineAt).toBe(fixedDeadline);

      for (let i = 0; i < 3; i += 1) {
        clock.advance(2_000); // 6 seconds total — still well inside the turn
        const res = await app.inject({
          method: 'GET',
          url: `/game-sessions/${publicId}`,
        });
        expect(res.json().turnDeadlineAt).toBe(fixedDeadline);
        expect(res.json().stateVersion).toBe(0);
      }
    });

    it('an expired deadline is applied lazily on read, exactly once, leaving board and scores untouched', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2 } = await setupTestApp(undefined, clock.now);
      const { publicId, joined } = await startWordBattle(app, p1, p2);

      clock.advance(TURN_DURATION_MS); // exactly at the persisted deadline

      const first = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      const s = first.json();

      // Timeout penalty: 1 life lost, no points, board unchanged, turn advanced
      expect(s.stateVersion).toBe(1);
      expect(s.currentPlayerId).toBe(p2.user.id);
      expect(s.state.lives[p1.user.id]).toBe(2);
      expect(s.state.scores[p1.user.id]).toBe(0);
      expect(s.state.usedWords).toEqual([]);
      expect(JSON.stringify(s.state.board)).toBe(JSON.stringify(joined.state.board));
      expect(s.state.history).toHaveLength(1);
      expect(s.state.history[0].penalty).toBe('TIMEOUT');

      // The next turn carries a fresh server deadline
      expect(s.turnDeadlineAt).toBe(
        new Date(start.getTime() + 2 * TURN_DURATION_MS).toISOString(),
      );

      // Repeated reads after expiry are consistent and cause no further advancement
      const second = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(second.json()).toEqual(s);
      expect(s.state.lives[p1.user.id]).toBe(2); // not 1 — the penalty applied once
    });

    it('a late move cannot steal a turn the deadline has already consumed', async () => {
      const clock = createTestClock(start);
      const mockValidator: WordValidator = { isValidWord: async () => true };
      const { app, p1, p2 } = await setupTestApp(mockValidator, clock.now);
      const { publicId, joined } = await startWordBattle(app, p1, p2);

      const { word, path } = findFormableWordOnBoard(joined.state.board);

      clock.advance(TURN_DURATION_MS);

      // P1 (whose turn has expired) submits a perfectly formable word — the lazy
      // reconciliation consumes the turn first and the late move is rejected.
      const late = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word, path }, expectedStateVersion: 0 },
      });
      expect(late.statusCode).toBe(409);
      expect(late.json().code).toBe('STALE_GAME_STATE');

      const after = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(after.json().stateVersion).toBe(1);
      expect(after.json().state.history[0].penalty).toBe('TIMEOUT');
      expect(after.json().state.scores[p1.user.id]).toBe(0);

      // The new active player can play normally against the advanced version
      const p2Move = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
        payload: { move: { word, path }, expectedStateVersion: 1 },
      });
      expect(p2Move.statusCode).toBe(200);
      expect(p2Move.json().stateVersion).toBe(2);
      expect(p2Move.json().state.scores[p2.user.id]).toBe(word.length);
    });

    it('each move establishes a fresh deadline for the next turn from the server clock', async () => {
      const clock = createTestClock(start);
      const mockValidator: WordValidator = { isValidWord: async () => true };
      const { app, p1, p2 } = await setupTestApp(mockValidator, clock.now);
      const { publicId, joined } = await startWordBattle(app, p1, p2);

      const { word, path } = findFormableWordOnBoard(joined.state.board);

      clock.advance(5_000);
      const move = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { word, path }, expectedStateVersion: 0 },
      });
      expect(move.statusCode).toBe(200);
      expect(move.json().turnDeadlineAt).toBe(
        new Date(start.getTime() + 5_000 + TURN_DURATION_MS).toISOString(),
      );
    });

    it('direct timeout moves are rejected at the moves endpoint', async () => {
      const { app, p1, p2 } = await setupTestApp();
      const { publicId } = await startWordBattle(app, p1, p2);

      const res = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/moves`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { type: 'timeout' }, expectedStateVersion: 0 },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('INVALID_MOVE');

      const getRes = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(getRes.json().stateVersion).toBe(0);
    });

    it('expire-turn is refused for non-participants and for sessions without a deadline', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2, p3 } = await setupTestApp(undefined, clock.now);

      const { publicId } = await startWordBattle(app, p1, p2);
      clock.advance(TURN_DURATION_MS);

      const stranger = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p3.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      });
      expect(stranger.statusCode).toBe(403);
      expect(stranger.json().code).toBe('PLAYER_NOT_IN_GAME');

      // A demo session has no stored deadline: reconciliation is refused and no
      // penalty can ever be applied to a game that does not support timeouts.
      const demoCreate = await app.inject({
        method: 'POST',
        url: '/game-sessions',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { gameId: 'take-turn-demo' },
      });
      const demoJoin = await app.inject({
        method: 'POST',
        url: `/game-sessions/${demoCreate.json().publicId}/join`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      });
      clock.advance(10 * TURN_DURATION_MS);

      const demoExpire = await app.inject({
        method: 'POST',
        url: `/game-sessions/${demoCreate.json().publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: 0 },
      });
      expect(demoExpire.statusCode).toBe(409);
      expect(demoExpire.json().code).toBe('TURN_NOT_EXPIRED');

      const demoGet = await app.inject({
        method: 'GET',
        url: `/game-sessions/${demoCreate.json().publicId}`,
      });
      expect(demoGet.json().status).toBe('active');
      expect(demoGet.json().stateVersion).toBe(0);
      expect(demoJoin.json().turnDeadlineAt).toBeNull();
    });

    it('expire-turn rejects missing or malformed bodies with 400 INVALID_INPUT', async () => {
      const { app, p1, p2 } = await setupTestApp();
      const { publicId, joined } = await startWordBattle(app, p1, p2);

      // No body at all must be a deterministic 400, never an internal error.
      const noBody = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
      });
      expect(noBody.statusCode).toBe(400);
      expect(noBody.json().code).toBe('INVALID_INPUT');

      const emptyObject = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: {},
      });
      expect(emptyObject.statusCode).toBe(400);
      expect(emptyObject.json().code).toBe('INVALID_INPUT');

      const wrongType = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: '0' },
      });
      expect(wrongType.statusCode).toBe(400);
      expect(wrongType.json().code).toBe('INVALID_INPUT');

      // The rejected requests never touched the session: the turn and its deadline
      // remain exactly as they were when the game started.
      const get = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(get.json().stateVersion).toBe(0);
      expect(get.json().turnDeadlineAt).toBe(joined.turnDeadlineAt);
      expect(get.json().currentPlayerId).toBe(p1.user.id);
    });

    it('repeated timeouts end the match by knockout and clear the deadline', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2 } = await setupTestApp(undefined, clock.now);
      const { publicId } = await startWordBattle(app, p1, p2);

      // Five alternating expiries: P1 times out three times (3 lives), P2 twice.
      const expireResponses = [];
      for (let i = 0; i < 5; i += 1) {
        clock.advance(TURN_DURATION_MS);
        const active = i % 2 === 0 ? p1 : p2;
        const res = await app.inject({
          method: 'POST',
          url: `/game-sessions/${publicId}/expire-turn`,
          headers: { authorization: `Bearer ${active.sessionToken}` },
          payload: { expectedStateVersion: i },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().stateVersion).toBe(i + 1);
        expireResponses.push(res);
      }

      const finished = expireResponses[4]!.json();
      expect(finished.status).toBe('completed');
      expect(finished.result.isKnockout).toBe(true);
      expect(finished.result.winnerId).toBe(p2.user.id);
      expect(finished.turnDeadlineAt).toBeNull();

      // No further expiry can apply to a completed match
      clock.advance(60_000);
      const afterEnd = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/expire-turn`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { expectedStateVersion: 5 },
      });
      expect(afterEnd.statusCode).toBe(400);
      expect(afterEnd.json().code).toBe('GAME_NOT_ACTIVE');

      const reread = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(reread.json().status).toBe('completed');
      expect(reread.json().stateVersion).toBe(5);
    });

    it('bounded sweeps expire each turn at most once and respect the batch limit', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2, sessionService } = await setupTestApp(undefined, clock.now);

      const a = await startWordBattle(app, p1, p2);
      const b = await startWordBattle(app, p1, p2);

      clock.advance(TURN_DURATION_MS);

      // Batch limit 1: only one expired session is reconciled per sweep call
      const r1 = await sessionService.reconcileExpiredTurns(1);
      expect(r1).toEqual({ scanned: 1, reconciled: 1 });

      const r2 = await sessionService.reconcileExpiredTurns(10);
      expect(r2).toEqual({ scanned: 1, reconciled: 1 });

      // Both turns consumed exactly once — nothing left to reconcile
      const r3 = await sessionService.reconcileExpiredTurns(10);
      expect(r3).toEqual({ scanned: 0, reconciled: 0 });

      const sessionA = await app.inject({
        method: 'GET',
        url: `/game-sessions/${a.publicId}`,
      });
      expect(sessionA.json().stateVersion).toBe(1);
      const sessionB = await app.inject({
        method: 'GET',
        url: `/game-sessions/${b.publicId}`,
      });
      expect(sessionB.json().stateVersion).toBe(1);
    });

    it('self-heals a legacy backfilled deadline on a game that cannot process timeouts', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2, sessionService, sessionRepo } = await setupTestApp(
        undefined,
        clock.now,
      );

      // Simulate the ADR-007 deployment backfill: an active take-turn-demo session
      // holding a deadline its game definition can never honour (it rejects timeout
      // moves), planted directly through the repository.
      const legacy = await sessionRepo.createSession({
        publicId: 'legacy-deadline-demo',
        gameId: 'take-turn-demo',
        status: 'waiting',
        state: {},
        stateVersion: 0,
        currentPlayerId: null,
        creatorUserId: p1.user.id,
        creatorSeat: '0',
      });
      await sessionRepo.addPlayer(legacy.id, p2.user.id, '1');
      const demoState = demoGame.createInitialState([
        { id: p1.user.id, displayName: 'PlayerOne' },
        { id: p2.user.id, displayName: 'PlayerTwo' },
      ]);
      await sessionRepo.startSession(
        legacy.id,
        demoState,
        demoState.currentPlayerId,
        new Date(start.getTime() - 60_000),
      );

      // Reads reconcile: the unsupported deadline is cleared as infrastructure metadata —
      // no penalty, no turn advance — instead of failing the read with an INVALID_MOVE.
      const read = await app.inject({
        method: 'GET',
        url: '/game-sessions/legacy-deadline-demo',
      });
      expect(read.statusCode).toBe(200);
      expect(read.json().turnDeadlineAt).toBeNull();
      expect(read.json().stateVersion).toBe(0);
      expect(read.json().status).toBe('active');
      expect(read.json().currentPlayerId).toBe(p1.user.id);

      const stored = await sessionRepo.findSessionByPublicId('legacy-deadline-demo');
      expect(stored?.turnDeadlineAt).toBeNull();

      // The game continues normally at the same state version.
      const move = await app.inject({
        method: 'POST',
        url: '/game-sessions/legacy-deadline-demo/moves',
        headers: { authorization: `Bearer ${p1.sessionToken}` },
        payload: { move: { points: 1 }, expectedStateVersion: 0 },
      });
      expect(move.statusCode).toBe(200);
      expect(move.json().stateVersion).toBe(1);

      // The sweeper no longer sees the healed session, so it cannot retry it forever.
      clock.advance(10 * TURN_DURATION_MS);
      expect(await sessionService.reconcileExpiredTurns(10)).toEqual({
        scanned: 0,
        reconciled: 0,
      });
    });
  });

  describe('Phase 2: Fog-of-War Security & 1-Tap Rematch Handshake', () => {
    it('strips internal rngSeed from public session state view (Fog-of-War)', async () => {
      const { app, p1, p2 } = await setupTestApp();
      const { publicId } = await startWordBattle(app, p1, p2);

      const res = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.state).toBeDefined();
      expect(data.state.board).toBeDefined();
      expect(data.state.rngSeed).toBeUndefined();
    });

    it('provisions 1-tap rematch with loser taking first turn and links both players', async () => {
      const clock = createTestClock(start);
      const { app, p1, p2 } = await setupTestApp(undefined, clock.now);
      const { publicId } = await startWordBattle(app, p1, p2);

      // Knockout P1: P1 times out 3 times (P2 times out twice)
      for (let i = 0; i < 5; i += 1) {
        clock.advance(TURN_DURATION_MS);
        const active = i % 2 === 0 ? p1 : p2;
        await app.inject({
          method: 'POST',
          url: `/game-sessions/${publicId}/expire-turn`,
          headers: { authorization: `Bearer ${active.sessionToken}` },
          payload: { expectedStateVersion: i },
        });
      }

      // Verify original game ended with P2 as winner and P1 as loser
      const completed = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(completed.json().status).toBe('completed');
      expect(completed.json().result.winnerId).toBe(p2.user.id);

      // 1. P2 (the winner) requests a rematch
      const rematchRes1 = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/rematch`,
        headers: { authorization: `Bearer ${p2.sessionToken}` },
      });

      expect(rematchRes1.statusCode).toBe(200);
      const rematchSession1 = rematchRes1.json();
      expect(rematchSession1.status).toBe('active');
      expect(rematchSession1.publicId).not.toBe(publicId);

      // Loser (P1) is assigned seat 0 and first turn!
      expect(rematchSession1.currentPlayerId).toBe(p1.user.id);
      expect(rematchSession1.players[0].userId).toBe(p1.user.id);
      expect(rematchSession1.players[1].userId).toBe(p2.user.id);
      expect(rematchSession1.turnDeadlineAt).not.toBeNull();

      // 2. Original session now has rematchPublicId attached to its result
      const originalRefreshed = await app.inject({
        method: 'GET',
        url: `/game-sessions/${publicId}`,
      });
      expect(originalRefreshed.json().result.rematchPublicId).toBe(rematchSession1.publicId);

      // 3. P1 (the loser) requests rematch or polls: receives the EXACT same provisioned match
      const rematchRes2 = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/rematch`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
      });
      expect(rematchRes2.statusCode).toBe(200);
      expect(rematchRes2.json().publicId).toBe(rematchSession1.publicId);
    });

    it('rejects rematch if session is not completed or user is not a participant', async () => {
      const { app, p1, p2 } = await setupTestApp();
      const { publicId } = await startWordBattle(app, p1, p2);

      // Active match rejection
      const activeReject = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/rematch`,
        headers: { authorization: `Bearer ${p1.sessionToken}` },
      });
      expect(activeReject.statusCode).toBe(400);

      // Non-participant rejection
      const nonParticipantRes = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { username: 'SpectatorUser' },
      });
      const nonParticipant = nonParticipantRes.json();

      const spectatorReject = await app.inject({
        method: 'POST',
        url: `/game-sessions/${publicId}/rematch`,
        headers: { authorization: `Bearer ${nonParticipant.sessionToken}` },
      });
      expect(spectatorReject.statusCode).toBe(403);
    });
  });
});
