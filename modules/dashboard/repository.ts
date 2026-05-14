import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { and, sql } from "drizzle-orm";

export type DashboardStatsParams = {
  year?: string;
  month?: string;
  groupBy?: "month" | "year";
};

export async function getDashboardCompletionRate(params: DashboardStatsParams) {
  const { year, month, groupBy = "month" } = params;

  // Use to_char to format the truncated date nicely as string
  const dateFormat = groupBy === "year" ? "YYYY" : "YYYY-MM";
  const periodChunk = sql<string>`to_char(date_trunc(${sql.raw(`'${groupBy}'`)}, ${chats.createdAt}), ${sql.raw(`'${dateFormat}'`)})`;

  const conditions = [];
  if (year) {
    conditions.push(sql`extract(year from ${chats.createdAt}) = ${parseInt(year)}`);
  }
  if (month) {
    conditions.push(sql`extract(month from ${chats.createdAt}) = ${parseInt(month)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      period: periodChunk,
      totalChats: sql<number>`count(${chats.id})::int`,
      resolvedChats: sql<number>`sum(case when ${chats.isResolved} = true then 1 else 0 end)::int`,
    })
    .from(chats)
    .where(whereClause)
    .groupBy(periodChunk)
    .orderBy(periodChunk);

  return result;
}

export async function getDashboardTopIntents(params: DashboardStatsParams) {
  const { year, month, groupBy = "month" } = params;

  const dateFormat = groupBy === "year" ? "YYYY" : "YYYY-MM";
  const periodChunk = sql<string>`to_char(date_trunc(${sql.raw(`'${groupBy}'`)}, ${chats.createdAt}), ${sql.raw(`'${dateFormat}'`)})`;

  const conditions = [];
  if (year) {
    conditions.push(sql`extract(year from ${chats.createdAt}) = ${parseInt(year)}`);
  }
  if (month) {
    conditions.push(sql`extract(month from ${chats.createdAt}) = ${parseInt(month)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      period: periodChunk,
      intent: chats.intent,
      count: sql<number>`count(${chats.id})::int`,
    })
    .from(chats)
    .where(whereClause)
    .groupBy(periodChunk, chats.intent)
    .orderBy(periodChunk, sql`count(${chats.id}) desc`);

  return result;
}

import { messageFeedbacks } from "@/lib/db/schema/message_feedbacks";

export async function getDashboardFeedbackStats(params: DashboardStatsParams) {
  const { year, month, groupBy = "month" } = params;

  const dateFormat = groupBy === "year" ? "YYYY" : "YYYY-MM";
  const periodChunk = sql<string>`to_char(date_trunc(${sql.raw(`'${groupBy}'`)}, ${messageFeedbacks.createdAt}), ${sql.raw(`'${dateFormat}'`)})`;

  const conditions = [];
  if (year) {
    conditions.push(sql`extract(year from ${messageFeedbacks.createdAt}) = ${parseInt(year)}`);
  }
  if (month) {
    conditions.push(sql`extract(month from ${messageFeedbacks.createdAt}) = ${parseInt(month)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      period: periodChunk,
      likes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'like' then 1 else 0 end)::int`,
      dislikes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'dislike' then 1 else 0 end)::int`,
      none: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'none' then 1 else 0 end)::int`,
      total: sql<number>`count(${messageFeedbacks.id})::int`,
    })
    .from(messageFeedbacks)
    .where(whereClause)
    .groupBy(periodChunk)
    .orderBy(periodChunk);

  return result;
}
