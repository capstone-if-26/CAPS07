import { pgTable, varchar, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { messages } from './messages';

export const messageFeedbacks = pgTable('message_feedbacks', {
  id: uuid('id').primaryKey().defaultRandom(),
  rating: integer('rating'),
  reason: varchar('reason', { length: 100 }),
  metadata: text('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),

  messageId: varchar('message_id', { length: 100 }).references(() => messages.id, { onDelete: 'cascade' }).notNull(),
});

export const messageFeedbackRelations = relations(messageFeedbacks, ({ one }) => ({
  message: one(messages, {
    fields: [messageFeedbacks.messageId],
    references: [messages.id],
  }),
}));