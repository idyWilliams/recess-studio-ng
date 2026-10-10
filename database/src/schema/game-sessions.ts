import { integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { games } from './games.js';

/** Authoritative game session — JSONB holds game-specific state until normalized if needed. */
export const gameSessions = pgTable('game_sessions', {
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
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
