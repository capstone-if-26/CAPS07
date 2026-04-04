import { pgTable, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { messages } from './messages';

export const chats = pgTable('chats', {
  id: varchar('id', { length: 100 }).primaryKey(),
  title: varchar('title', { length: 100 }),
  status: varchar('status', { length: 32 }),

  // Sesuai PDM menggunakan text, walau praktik terbaiknya adalah timestamp
  lastMessageAt: text('last_message_at'),

  // Menggunakan text untuk menyimpan JSON string (atau jsonb() jika Anda butuh query spesifik dalam JSON)
  metadata: text('metadata'),
  summary: text('summary').default('').notNull(),
  summaryUpdated: timestamp('summary_updated'),

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