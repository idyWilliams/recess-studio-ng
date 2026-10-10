import { boolean, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

/** Registered game definitions on the platform. */
export const games = pgTable('games', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  minPlayers: integer('min_players').notNull(),
  maxPlayers: integer('max_players').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
