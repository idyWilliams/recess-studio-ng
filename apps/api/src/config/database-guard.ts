import type { Env } from './env.js';

export interface DatabaseGuardDependencies {
  verifyConnection?: (databaseUrl: string) => Promise<void>;
  logger?: {
    fatal: (obj: Record<string, unknown>, msg: string) => void;
  };
  exit?: (code: number) => never | void;
}

/**
 * Production Database Fail-Fast Guard (DAT-01).
 *
 * In production, never silently degrade to ephemeral in-memory storage when
 * DATABASE_URL is missing or the database connection fails. Development and test
 * environments preserve the convenient in-memory fallback.
 */
export async function assertProductionDatabaseGuard(
  env: Pick<Env, 'NODE_ENV' | 'DATABASE_URL'>,
  deps: DatabaseGuardDependencies = {},
): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const logFatal =
    deps.logger?.fatal ??
    ((obj: Record<string, unknown>, msg: string) => {
      console.error(JSON.stringify({ level: 'fatal', ...obj, msg }));
    });

  if (!env.DATABASE_URL) {
    logFatal(
      { reason: 'MISSING_DATABASE_URL' },
      'DATABASE_URL is required when NODE_ENV is production. Refusing to silently degrade to ephemeral in-memory storage.',
    );
    exit(1);
    return;
  }

  if (deps.verifyConnection) {
    try {
      await deps.verifyConnection(env.DATABASE_URL);
    } catch (error) {
      logFatal(
        {
          reason: 'DATABASE_CONNECTION_FAILED',
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to connect to PostgreSQL in production. Refusing to silently degrade to ephemeral in-memory storage.',
      );
      exit(1);
      return;
    }
  }
}
