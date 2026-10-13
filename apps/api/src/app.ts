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
import { TurnTimeoutSweeper } from './sessions/turn-timeout-sweeper.js';

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

  // Background turn-timeout sweeper (ADR-007). Disabled under NODE_ENV=test so unit and
  // integration tests never depend on wall-clock timers — tests drive the same
  // reconciliation path deterministically via SessionService. Started on onReady and
  // stopped on onClose so `app.close()` cleanly drains an in-flight sweep.
  if (env.NODE_ENV !== 'test') {
    const sweeper = new TurnTimeoutSweeper(resolvedSession, {
      intervalMs: env.TURN_SWEEP_INTERVAL_MS,
      batchSize: env.TURN_SWEEP_BATCH_SIZE,
      logger: app.log,
    });
    app.addHook('onReady', () => {
      sweeper.start();
    });
    app.addHook('onClose', async () => {
      await sweeper.stop();
    });
  }

  return app;
}
