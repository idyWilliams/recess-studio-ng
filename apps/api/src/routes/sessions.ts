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
}
