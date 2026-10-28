import type { FastifyInstance } from 'fastify';

import type { RegisterUserInput } from '@recess/shared';

import { IdentityService, type PlayerChallengeInput } from '../identity/identity-service.js';
import { authenticateRequest } from './auth-helper.js';

export function registerIdentityRoutes(
  app: FastifyInstance,
  identityService: IdentityService = new IdentityService(),
): void {
  // POST /auth/register
  app.post<{ Body: RegisterUserInput }>('/auth/register', async (request, reply) => {
    const response = await identityService.registerUser(request.body);
    return reply.status(201).send(response);
  });

  // POST /players/register (alias for consistent player namespace)
  app.post<{ Body: RegisterUserInput }>('/players/register', async (request, reply) => {
    const response = await identityService.registerUser(request.body);
    return reply.status(200).send(response);
  });

  // GET /me
  app.get('/me', async (request) => {
    return authenticateRequest(request, identityService);
  });

  // POST /players/heartbeat
  app.post('/players/heartbeat', async (request, reply) => {
    try {
      const auth = await authenticateRequest(request, identityService);
      await identityService.recordHeartbeat(auth.user.id);
      return reply.status(200).send({ ok: true, activeAt: new Date().toISOString() });
    } catch {
      return reply.status(200).send({ ok: false });
    }
  });

  // GET /players/live-stats
  app.get('/players/live-stats', async () => {
    return identityService.getLiveStats();
  });

  // GET /gaming-profiles/:id
  app.get<{ Params: { id: string } }>('/gaming-profiles/:id', async (request) => {
    const { id } = request.params;
    return identityService.getPublicGamingProfile(id);
  });

  // POST /players/challenge
  app.post<{ Body: PlayerChallengeInput }>('/players/challenge', async (request, reply) => {
    const response = await identityService.createChallenge(request.body);
    return reply.status(200).send(response);
  });

  // GET /players/notifications
  app.get<{ Querystring: { userId?: string; targetId?: string; profileId?: string } }>(
    '/players/notifications',
    async (request, reply) => {
      const target =
        request.query.userId || request.query.targetId || request.query.profileId;
      if (!target) {
        return reply.status(200).send([]);
      }
      const notifications = identityService.getNotifications(target);
      return reply.status(200).send(notifications);
    },
  );

  // POST /players/notifications/:id/dismiss
  app.post<{ Params: { id: string } }>(
    '/players/notifications/:id/dismiss',
    async (request, reply) => {
      const ok = identityService.dismissNotification(request.params.id);
      return reply.status(200).send({ ok });
    },
  );

  // DELETE /players/notifications/:id
  app.delete<{ Params: { id: string } }>(
    '/players/notifications/:id',
    async (request, reply) => {
      const ok = identityService.dismissNotification(request.params.id);
      return reply.status(200).send({ ok });
    },
  );
}
