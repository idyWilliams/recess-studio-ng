import { sql } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/** Public gaming identity (username, avatar, stats surface). */
export const gamingProfiles = pgTable(
  'gaming_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 32 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 2048 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('gaming_profiles_username_lower_idx').on(sql`lower(${table.username})`),
  ],
);
