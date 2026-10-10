import type { FastifyInstance } from 'fastify';

import type { RegisterUserInput } from '@recess/shared';

import { AppError } from '../errors/app-error.js';
import { IdentityService } from '../identity/identity-service.js';

function extractSessionToken(
  authHeader?: string,
  sessionHeader?: string | string[],
): string {
  if (typeof sessionHeader === 'string' && sessionHeader.trim().length > 0) {
    return sessionHeader.trim();
  }

  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.trim().split(' ');
    if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer' && parts[1]) {
      return parts[1];
    }
  }

  throw new AppError(
    'UNAUTHORIZED',
    'Missing or invalid authorization token. Provide Authorization: Bearer <token>',
    401,
  );
}

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
    const authHeader = request.headers.authorization;
    const sessionHeader = request.headers['x-session-token'];
    const token = extractSessionToken(authHeader, sessionHeader);

    return identityService.authenticate(token);
  });

  // GET /gaming-profiles/:id
  app.get<{ Params: { id: string } }>('/gaming-profiles/:id', async (request) => {
    const { id } = request.params;
    return identityService.getPublicGamingProfile(id);
  });
}
