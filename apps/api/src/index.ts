import { loadEnv } from './config/env.js';
import { buildApp } from './app.js';
import { loadDictionary } from './games/word-validator.js';

const env = loadEnv();

// Load the ENABLE1 dictionary into memory before accepting requests.
// This is a one-time startup cost (~5–20 ms) that eliminates all
// network-time word validation latency for the lifetime of the process.
await loadDictionary();

const app = buildApp(env);

// Graceful shutdown: app.close() stops the turn-timeout sweeper (onClose hook) and drains
// in-flight requests before exit. Turn deadlines live in the database, so an abrupt
// termination can only delay timeout detection — it can never double-apply a timeout or
// extend a stored deadline.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'Received shutdown signal, closing server');
    app.close().then(
      () => {
        process.exit(0);
      },
      (error: unknown) => {
        app.log.error(error, 'Error during shutdown');
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
