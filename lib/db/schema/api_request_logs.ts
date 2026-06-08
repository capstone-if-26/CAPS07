import {
  pgTable,
  varchar,
  integer,
  boolean,
  text,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";

export const apiRequestLogs = pgTable("api_request_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: varchar("endpoint", { length: 32 }).notNull(),
  chatId: uuid("chat_id"),
  requestId: varchar("request_id", { length: 64 }),
  method: varchar("method", { length: 8 }).notNull(),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull(),
  isError: boolean("is_error").notNull().default(false),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
