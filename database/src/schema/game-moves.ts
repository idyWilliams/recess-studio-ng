import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { gameSessions } from './game-sessions.js';
import { users } from './users.js';

export const gameMoves = pgTable(
  'game_moves',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    move: jsonb('move').notNull(),
    stateVersionAfter: integer('state_version_after').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('game_moves_session_version_idx').on(
      table.sessionId,
      table.stateVersionAfter,
    ),
  ],
);
