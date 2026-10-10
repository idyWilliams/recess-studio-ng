import Fastify from 'fastify';

import type { Env } from './config/env.js';
import { registerErrorHandler } from './errors/error-handler.js';
import { IdentityService } from './identity/identity-service.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerIdentityRoutes } from './routes/identity.js';

export function buildApp(_env: Env, identityService = new IdentityService()) {
  const app = Fastify({
    logger: true,
  });

  registerErrorHandler(app);
  void app.register(registerHealthRoutes);
  registerIdentityRoutes(app, identityService);

  return app;
}
