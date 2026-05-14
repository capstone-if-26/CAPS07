import { pgTable, varchar, timestamp, text, uuid, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { messages } from './messages';

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 100 }),
  status: varchar('status', { length: 32 }),

  // Sesuai PDM menggunakan text, walau praktik terbaiknya adalah timestamp
  lastMessageAt: text('last_message_at'),

  // Menyimpan metadata dan ringkasan chat
  metadata: text('metadata'),
  summary: text('summary').default('').notNull(),
  summaryUpdated: timestamp('summary_updated'),

  // Tracking Dashboard & Analitik
  intent: text('intent').default('Lainnya').notNull(),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at'),

  // Foreign Key ke tabel Users. 
  // onDelete: 'cascade' memastikan tidak ada sesi chat yang melayang jika user dihapus permanen.
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
});

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));