import { describe, expect, it } from 'vitest';

import { loadEnv } from './config/env.js';
import { buildApp } from './app.js';

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = buildApp(loadEnv({ NODE_ENV: 'test', PORT: '4000' }));
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
