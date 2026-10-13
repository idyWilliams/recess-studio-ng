import type { FastifyInstance } from 'fastify';

import type {
  CreateSessionInput,
  JoinSessionInput,
  SubmitMoveInput,
} from '@recess/shared';

import type { IdentityService } from '../identity/identity-service.js';
import type { SessionService } from '../sessions/session-service.js';
import { authenticateRequest } from './auth-helper.js';

export function registerSessionRoutes(
  app: FastifyInstance,
  sessionService: SessionService,
  identityService: IdentityService,
): void {
  // POST /game-sessions — Create new game session (authenticated)
  app.post<{ Body: CreateSessionInput }>('/game-sessions', async (request, reply) => {
    const auth = await authenticateRequest(request, identityService);
    const session = await sessionService.createSession(auth.user.id, request.body);
    return reply.status(201).send(session);
  });

  // GET /game-sessions/:publicId — Retrieve game session state and players
  app.get<{ Params: { publicId: string } }>(
    '/game-sessions/:publicId',
    async (request) => {
      const { publicId } = request.params;
      return sessionService.getSession(publicId);
    },
  );

  // POST /game-sessions/:publicId/join — Join game session (authenticated)
  app.post<{ Params: { publicId: string }; Body: JoinSessionInput }>(
    '/game-sessions/:publicId/join',
    async (request) => {
      const auth = await authenticateRequest(request, identityService);
      const { publicId } = request.params;
      return sessionService.joinSession(auth.user.id, publicId, request.body);
    },
  );

  // POST /game-sessions/:publicId/moves — Submit authoritative move (authenticated)
  app.post<{ Params: { publicId: string }; Body: SubmitMoveInput }>(
    '/game-sessions/:publicId/moves',
    async (request) => {
      const auth = await authenticateRequest(request, identityService);
      const { publicId } = request.params;
      return sessionService.submitMove(auth.user.id, publicId, request.body);
    },
  );

  /**
   * POST /game-sessions/:publicId/expire-turn
   *
   * Asks the server to reconcile the current turn against its persisted deadline
   * (ADR-007). A client may request reconciliation, but it cannot cause a timeout
   * before the stored deadline has actually expired per server time — the endpoint
   * is server-verified, never client-authorized:
   *
   *  - Before the deadline: 409 TURN_NOT_EXPIRED (no penalty, no state change).
   *  - After the deadline: the authoritative timeout transition is applied (1 life
   *    lost by the active player, no points, board unchanged, turn advances unless
   *    the match ends by knockout) and the post-transition session is returned.
   *  - If the state has already advanced (a move or another reconciliation won the
   *    race): 409 STALE_GAME_STATE, which callers should treat as "discard this
   *    request"; the authoritative outcome is already persisted and readable via
   *    GET /game-sessions/:publicId.
   *
   * Infrastructure failures (network errors, server crash, restarts) NEVER cost a
   * life: the deadline lives in the database and is consumed at most once.
   *
   * Body: { expectedStateVersion: number }
   */
  app.post<{
    Params: { publicId: string };
    Body: { expectedStateVersion: number };
  }>('/game-sessions/:publicId/expire-turn', async (request) => {
    const auth = await authenticateRequest(request, identityService);
    const { publicId } = request.params;
    const { expectedStateVersion } = request.body;

    return sessionService.expireTurn(auth.user.id, publicId, expectedStateVersion);
  });
}
