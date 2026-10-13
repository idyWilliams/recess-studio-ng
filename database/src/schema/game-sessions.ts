import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { games } from './games.js';

/**
 * Authoritative game session — JSONB holds game-specific state until normalized if needed.
 *
 * `turn_deadline_at` is the server-authoritative wall-clock deadline for the current turn
 * (see ADR-007). It is intentionally stored outside the JSONB game state so the pure
 * game core stays free of wall-clock concerns. NULL means no deadline is set (waiting
 * sessions, completed sessions, or games that do not support turn timeouts).
 */
export const gameSessions = pgTable(
  'game_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: varchar('public_id', { length: 32 }).notNull().unique(),
    gameId: varchar('game_id', { length: 64 })
      .notNull()
      .references(() => games.id),
    status: varchar('status', { length: 32 }).notNull(),
    state: jsonb('state').notNull().default({}),
    stateVersion: integer('state_version').notNull().default(0),
    currentPlayerId: uuid('current_player_id'),
    result: jsonb('result'),
    turnDeadlineAt: timestamp('turn_deadline_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Partial index: only active sessions can have a due timeout, so the sweeper's
    // `status = 'active' AND turn_deadline_at <= now()` lookup stays small.
    index('game_sessions_expired_turn_idx')
      .on(table.turnDeadlineAt)
      .where(sql`${table.status} = 'active'`),
  ],
);
