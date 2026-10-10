import Fastify from 'fastify';

import type { Env } from './config/env.js';
import { registerErrorHandler } from './errors/error-handler.js';
import { registerHealthRoutes } from './routes/health.js';

export function buildApp(_env: Env) {
  const app = Fastify({
    logger: true,
  });

  registerErrorHandler(app);
  void app.register(registerHealthRoutes);

  return app;
}
