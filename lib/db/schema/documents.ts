import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  namespace: text('namespace').notNull().unique(),
  description: text('description').notNull(),
  documentType: text('document_type').notNull(),
  totalChunks: integer('total_chunks').notNull().default(0),
  fileName: text('file_name').notNull(),
  statusDocument: text('status_document').notNull().default('Berlaku'),
  version: text('version').notNull().default('v1.0'),
  effectiveDate: timestamp('effective_date'),
  processingStatus: text('status').notNull().default('processing'),
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});
