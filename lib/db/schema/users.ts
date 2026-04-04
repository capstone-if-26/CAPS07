import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { chats } from './chats';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  
  // Custom fields
  authProvider: text('auth_provider'),
  password: text('password'),
  role: text('role').default('user'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
}));