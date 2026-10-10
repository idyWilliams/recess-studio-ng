import Fastify, { type FastifyInstance } from 'fastify';

import { createDatabaseClient } from '@recess/database';

import type { Env } from './config/env.js';
import { registerErrorHandler } from './errors/error-handler.js';
import {
  IdentityService,
  InMemoryIdentityRepository,
  PostgresIdentityRepository,
} from './identity/identity-service.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerIdentityRoutes } from './routes/identity.js';

export function buildApp(env: Env, identityService?: IdentityService): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  let resolvedIdentity = identityService;
  if (!resolvedIdentity) {
    if (env.DATABASE_URL) {
      const { db } = createDatabaseClient(env.DATABASE_URL);
      resolvedIdentity = new IdentityService(new PostgresIdentityRepository(db));
    } else {
      resolvedIdentity = new IdentityService(new InMemoryIdentityRepository());
    }
  }

  registerErrorHandler(app);
  void app.register(registerHealthRoutes);
  registerIdentityRoutes(app, resolvedIdentity);

  return app;
}
