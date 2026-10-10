import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { gameSessions } from './game-sessions.js';
import { users } from './users.js';

export const gameMessages = pgTable('game_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => gameSessions.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
