import { pgTable, varchar, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const feedbacks = pgTable('feedbacks', {
  id: uuid('id').primaryKey().defaultRandom(),
  rating: integer('rating'),
  message: text('message'),
  category: varchar('category', { length: 50 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
});
