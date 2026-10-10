import type { FastifyInstance } from 'fastify';

import type { RegisterUserInput } from '@recess/shared';

import { AppError } from '../errors/app-error.js';
import { IdentityService } from '../identity/identity-service.js';

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
    const userId = request.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') {
      throw new AppError(
        'UNAUTHORIZED',
        'Missing authentication header x-user-id',
        401,
      );
    }
    return identityService.getAuthUser(userId);
  });

  // GET /gaming-profiles/:id
  app.get<{ Params: { id: string } }>('/gaming-profiles/:id', async (request) => {
    const { id } = request.params;
    return identityService.getPublicGamingProfile(id);
  });
}
