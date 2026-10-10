import type { FastifyRequest } from 'fastify';

import type { AuthUserResponse } from '@recess/shared';

import { AppError } from '../errors/app-error.js';
import type { IdentityService } from '../identity/identity-service.js';

export function extractSessionToken(request: FastifyRequest): string {
  const sessionHeader = request.headers['x-session-token'];
  if (typeof sessionHeader === 'string' && sessionHeader.trim().length > 0) {
    return sessionHeader.trim();
  }

  const authHeader = request.headers.authorization;
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

export async function authenticateRequest(
  request: FastifyRequest,
  identityService: IdentityService,
): Promise<AuthUserResponse> {
  const token = extractSessionToken(request);
  return identityService.authenticate(token);
}
