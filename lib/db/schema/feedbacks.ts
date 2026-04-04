import { pgTable, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const feedbacks = pgTable('feedbacks', {
  id: varchar('id', { length: 100 }).primaryKey(),
  rating: integer('rating'),
  message: text('message'),
  category: varchar('category', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),

  userId: varchar('user_id', { length: 100 }).references(() => users.id, { onDelete: 'set null' }),
});
