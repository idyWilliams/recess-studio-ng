import Fastify, { type FastifyInstance } from 'fastify';

import { createDatabaseClient } from '@recess/database';

import type { Env } from './config/env.js';
import { registerErrorHandler } from './errors/error-handler.js';
import { GameRegistry } from './games/game-registry.js';
import {
  IdentityService,
  InMemoryIdentityRepository,
  PostgresIdentityRepository,
} from './identity/identity-service.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerIdentityRoutes } from './routes/identity.js';
import { registerSessionRoutes } from './routes/sessions.js';
import {
  InMemorySessionRepository,
  PostgresSessionRepository,
} from './sessions/session-repository.js';
import { SessionService } from './sessions/session-service.js';

export function buildApp(
  env: Env,
  identityService?: IdentityService,
  sessionService?: SessionService,
  gameRegistry: GameRegistry = new GameRegistry(),
): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  let resolvedIdentity = identityService;
  let resolvedSession = sessionService;

  if (env.DATABASE_URL && (!resolvedIdentity || !resolvedSession)) {
    const { db } = createDatabaseClient(env.DATABASE_URL);
    if (!resolvedIdentity) {
      resolvedIdentity = new IdentityService(new PostgresIdentityRepository(db));
    }
    if (!resolvedSession) {
      resolvedSession = new SessionService(
        new PostgresSessionRepository(db),
        gameRegistry,
      );
    }
  }

  if (!resolvedIdentity) {
    resolvedIdentity = new IdentityService(new InMemoryIdentityRepository());
  }
  if (!resolvedSession) {
    resolvedSession = new SessionService(new InMemorySessionRepository(), gameRegistry);
  }

  registerErrorHandler(app);
  void app.register(registerHealthRoutes);
  registerIdentityRoutes(app, resolvedIdentity);
  registerSessionRoutes(app, resolvedSession, resolvedIdentity);

  return app;
}
