import { describe, expect, it, vi } from 'vitest';

import { assertProductionDatabaseGuard } from './database-guard.js';

describe('Production Database Fail-Fast Guard (DAT-01)', () => {
  it('allows startup without DATABASE_URL in development or test', async () => {
    const exit = vi.fn();
    const fatal = vi.fn();

    await assertProductionDatabaseGuard(
      { NODE_ENV: 'development' },
      { exit, logger: { fatal } },
    );
    await assertProductionDatabaseGuard(
      { NODE_ENV: 'test' },
      { exit, logger: { fatal } },
    );

    expect(exit).not.toHaveBeenCalled();
    expect(fatal).not.toHaveBeenCalled();
  });

  it('exits process with code 1 when DATABASE_URL is missing in production', async () => {
    const exit = vi.fn();
    const fatal = vi.fn();

    await assertProductionDatabaseGuard(
      { NODE_ENV: 'production' },
      { exit, logger: { fatal } },
    );

    expect(fatal).toHaveBeenCalledWith(
      { reason: 'MISSING_DATABASE_URL' },
      expect.stringContaining('DATABASE_URL is required when NODE_ENV is production'),
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits process with code 1 when PostgreSQL connection check fails in production', async () => {
    const exit = vi.fn();
    const fatal = vi.fn();
    const verifyConnection = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await assertProductionDatabaseGuard(
      {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      },
      { exit, logger: { fatal }, verifyConnection },
    );

    expect(verifyConnection).toHaveBeenCalledWith(
      'postgresql://user:pass@localhost:5432/db',
    );
    expect(fatal).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'DATABASE_CONNECTION_FAILED',
        error: 'ECONNREFUSED',
      }),
      expect.stringContaining('Failed to connect to PostgreSQL in production'),
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('succeeds and does not exit when PostgreSQL connection check succeeds in production', async () => {
    const exit = vi.fn();
    const fatal = vi.fn();
    const verifyConnection = vi.fn().mockResolvedValue(undefined);

    await assertProductionDatabaseGuard(
      {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      },
      { exit, logger: { fatal }, verifyConnection },
    );

    expect(verifyConnection).toHaveBeenCalledWith(
      'postgresql://user:pass@localhost:5432/db',
    );
    expect(exit).not.toHaveBeenCalled();
    expect(fatal).not.toHaveBeenCalled();
  });
});
