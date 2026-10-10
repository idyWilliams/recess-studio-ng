import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { gameSessions } from './game-sessions.js';
import { users } from './users.js';

export const gameMoves = pgTable('game_moves', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => gameSessions.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  move: jsonb('move').notNull(),
  stateVersionAfter: integer('state_version_after').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
