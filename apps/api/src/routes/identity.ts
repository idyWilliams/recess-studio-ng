import type { FastifyInstance } from 'fastify';

import type { RegisterUserInput } from '@recess/shared';

import { IdentityService } from '../identity/identity-service.js';
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

  // GET /me
  app.get('/me', async (request) => {
    return authenticateRequest(request, identityService);
  });

  // GET /gaming-profiles/:id
  app.get<{ Params: { id: string } }>('/gaming-profiles/:id', async (request) => {
    const { id } = request.params;
    return identityService.getPublicGamingProfile(id);
  });
}
