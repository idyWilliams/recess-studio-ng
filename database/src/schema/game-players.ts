import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { gameSessions } from './game-sessions.js';
import { users } from './users.js';

export const gamePlayers = pgTable('game_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => gameSessions.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  seat: varchar('seat', { length: 8 }).notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});
