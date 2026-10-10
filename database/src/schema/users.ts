import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/** Private internal platform identity — not the public gaming persona. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
