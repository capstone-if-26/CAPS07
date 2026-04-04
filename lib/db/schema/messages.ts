import { pgTable, varchar, text, integer, timestamp, AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { chats } from './chats';
import { messageFeedbacks } from './message_feedbacks';

export const messages = pgTable('messages', {
  id: varchar('id', { length: 100 }).primaryKey(),
  senderType: varchar('sender_type', { length: 100 }), // Contoh: 'user', 'assistant', 'system'
  content: text('content'),
  status: varchar('status', { length: 16 }),
  tokenCount: integer('token_count'),
  modelName: varchar('model_name', { length: 100 }),

  // Self-referencing FK menggunakan AnyPgColumn (karena tabel menunjuk dirinya sendiri sebelum selesai dievaluasi)
  parentMessage: varchar('parent_message', { length: 100 }).references((): AnyPgColumn => messages.id, { onDelete: 'set null' }),

  // Sesuai PDM ini varchar, walau secara logika indeks percakapan biasanya integer
  turnIndex: varchar('turn_index', { length: 100 }),
  metadata: text('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at'),

  chatId: varchar('chat_id', { length: 100 }).references(() => chats.id, { onDelete: 'set null' }).notNull(),
});

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  // Relasi self-referencing (Parent/Child Message)
  parent: one(messages, {
    fields: [messages.parentMessage],
    references: [messages.id],
    relationName: 'message_thread'
  }),
  replies: many(messages, { relationName: 'message_thread' }),
  feedbacks: many(messageFeedbacks),
}));