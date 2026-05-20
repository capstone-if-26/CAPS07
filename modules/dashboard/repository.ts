import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { messageFeedbacks } from "@/lib/db/schema/message_feedbacks";
import { and, eq, sql } from "drizzle-orm";

export type DashboardStatsParams = {
  year?: string;
  month?: string;
  groupBy?: "month" | "year";
};

export type DashboardOverviewParams = {
  days?: string; // "7" or "30", default "30"
  year?: string;
  month?: string;
};

function buildChatDateCondition(params: DashboardOverviewParams) {
  const { days, year, month } = params;
  const conditions = [];

  if (year) {
    conditions.push(sql`extract(year from ${chats.createdAt}) = ${parseInt(year)}`);
    if (month) {
      conditions.push(sql`extract(month from ${chats.createdAt}) = ${parseInt(month)}`);
    }
  } else {
    const d = days === "7" ? 7 : 30;
    conditions.push(sql`${chats.createdAt} >= now() - (${d} * interval '1 day')`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildFeedbackDateCondition(params: DashboardOverviewParams) {
  const { days, year, month } = params;
  const conditions = [];

  if (year) {
    conditions.push(sql`extract(year from ${messageFeedbacks.createdAt}) = ${parseInt(year)}`);
    if (month) {
      conditions.push(sql`extract(month from ${messageFeedbacks.createdAt}) = ${parseInt(month)}`);
    }
  } else {
    const d = days === "7" ? 7 : 30;
    conditions.push(sql`${messageFeedbacks.createdAt} >= now() - (${d} * interval '1 day')`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getDashboardOverviewSummary(params: DashboardOverviewParams) {
  const where = buildChatDateCondition(params);

  const result = await db
    .select({
      totalChats: sql<number>`count(${chats.id})::int`,
      resolvedChats: sql<number>`sum(case when ${chats.isResolved} = true then 1 else 0 end)::int`,
    })
    .from(chats)
    .where(where);

  return result[0];
}

export async function getDashboardOverviewIntents(params: DashboardOverviewParams) {
  const where = buildChatDateCondition(params);

  const result = await db
    .select({
      intent: chats.intent,
      count: sql<number>`count(${chats.id})::int`,
      percentage: sql<string>`round(count(${chats.id}) * 100.0 / nullif(sum(count(${chats.id})) over(), 0), 2)`,
    })
    .from(chats)
    .where(where)
    .groupBy(chats.intent)
    .orderBy(sql`count(${chats.id}) desc`);

  return result;
}

export async function getDashboardOverviewLikeRate(params: DashboardOverviewParams) {
  const where = buildFeedbackDateCondition(params);

  const result = await db
    .select({
      likes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'like' then 1 else 0 end)::int`,
      total: sql<number>`count(${messageFeedbacks.id})::int`,
    })
    .from(messageFeedbacks)
    .where(where);

  return result[0];
}

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

export async function getSessionAnalysisStats(params: DashboardOverviewParams) {
  const where = buildChatDateCondition(params);

  const result = await db
    .select({
      totalSessions: sql<number>`count(${chats.id})::int`,
      withIntent: sql<number>`sum(case when ${chats.intent} != 'Lainnya' then 1 else 0 end)::int`,
      withContact: sql<number>`sum(case when ${chats.isResolved} = true then 1 else 0 end)::int`,
      dropOff: sql<number>`sum(case when ${chats.intent} not in ('Literasi & Tips Keuangan', 'Lainnya') and ${chats.isResolved} = false then 1 else 0 end)::int`,
    })
    .from(chats)
    .where(where);

  return result[0];
}

export async function getUserMessageContents(params: DashboardOverviewParams): Promise<string[]> {
  const { days, year, month } = params;
  const chatConditions = [];

  if (year) {
    chatConditions.push(sql`extract(year from ${chats.createdAt}) = ${parseInt(year)}`);
    if (month) {
      chatConditions.push(sql`extract(month from ${chats.createdAt}) = ${parseInt(month)}`);
    }
  } else {
    const d = days === "7" ? 7 : 30;
    chatConditions.push(sql`${chats.createdAt} >= now() - (${d} * interval '1 day')`);
  }

  const result = await db
    .select({ content: messages.content })
    .from(messages)
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(
      and(
        eq(messages.senderType, "user"),
        chatConditions.length > 0 ? and(...chatConditions) : undefined
      )
    );

  return result
    .map((r) => r.content)
    .filter((c): c is string => typeof c === "string" && c.length > 0);
}

export async function getFeedbackOverall(params: DashboardOverviewParams) {
  const where = buildFeedbackDateCondition(params);

  const result = await db
    .select({
      likes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'like' then 1 else 0 end)::int`,
      dislikes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'dislike' then 1 else 0 end)::int`,
    })
    .from(messageFeedbacks)
    .where(where);

  return result[0];
}

export async function getFeedbackByIntent(params: DashboardOverviewParams) {
  const where = buildFeedbackDateCondition(params);

  const result = await db
    .select({
      intent: chats.intent,
      likes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'like' then 1 else 0 end)::int`,
      dislikes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'dislike' then 1 else 0 end)::int`,
    })
    .from(messageFeedbacks)
    .innerJoin(messages, eq(messageFeedbacks.messageId, messages.id))
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(where)
    .groupBy(chats.intent)
    .orderBy(chats.intent);

  return result;
}

export async function getFeedbackTrend(params: DashboardOverviewParams) {
  const { year, month } = params;
  const where = buildFeedbackDateCondition(params);

  // year-only → monthly buckets; everything else → daily buckets
  const byMonth = !!year && !month;
  const truncUnit = byMonth ? "month" : "day";
  const dateFormat = byMonth ? "YYYY-MM" : "YYYY-MM-DD";
  const periodChunk = sql<string>`to_char(date_trunc(${sql.raw(`'${truncUnit}'`)}, ${messageFeedbacks.createdAt}), ${sql.raw(`'${dateFormat}'`)})`;

  const result = await db
    .select({
      period: periodChunk,
      likes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'like' then 1 else 0 end)::int`,
      dislikes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'dislike' then 1 else 0 end)::int`,
    })
    .from(messageFeedbacks)
    .where(where)
    .groupBy(periodChunk)
    .orderBy(periodChunk);

  return result;
}
