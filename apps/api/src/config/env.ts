import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(1).optional(),
  // Server-authoritative turn-deadline sweeper (ADR-007). Defaults applied in
  // TurnTimeoutSweeper (1000 ms / 50 sessions) when not set. Always disabled under
  // NODE_ENV=test.
  TURN_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().optional(),
  TURN_SWEEP_BATCH_SIZE: z.coerce.number().int().positive().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}
