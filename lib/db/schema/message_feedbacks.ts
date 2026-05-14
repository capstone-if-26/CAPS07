import { pgTable, varchar, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { messages } from './messages';

export const messageFeedbacks = pgTable('message_feedbacks', {
  id: uuid('id').primaryKey().defaultRandom(),
  feedback: varchar('feedback', { length: 10 }).default('none'), // like, dislike, none

  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),

  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
});

export const messageFeedbackRelations = relations(messageFeedbacks, ({ one }) => ({
  message: one(messages, {
    fields: [messageFeedbacks.messageId],
    references: [messages.id],
  }),
}));