import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { messageFeedbacks } from "@/lib/db/schema/message_feedbacks";
import { apiRequestLogs } from "@/lib/db/schema/api_request_logs";
import { and, eq, sql } from "drizzle-orm";
import { DashboardOverviewParams, InsertApiRequestLogInput } from "./type";

// ---------------------------------------------------------------------------
// Shared date condition builders
// ---------------------------------------------------------------------------

function buildChatDateCondition(params: DashboardOverviewParams) {
  const { days, year, month } = params;
  const conditions = [];

  if (year) {
    conditions.push(
      sql`extract(year from ${chats.createdAt}) = ${parseInt(year)}`,
    );
    if (month) {
      conditions.push(
        sql`extract(month from ${chats.createdAt}) = ${parseInt(month)}`,
      );
    }
  } else {
    const d = days === "7" ? 7 : 30;
    conditions.push(
      sql`${chats.createdAt} >= now() - (${d} * interval '1 day')`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildFeedbackDateCondition(params: DashboardOverviewParams) {
  const { days, year, month } = params;
  const conditions = [];

  if (year) {
    conditions.push(
      sql`extract(year from ${messageFeedbacks.createdAt}) = ${parseInt(year)}`,
    );
    if (month) {
      conditions.push(
        sql`extract(month from ${messageFeedbacks.createdAt}) = ${parseInt(month)}`,
      );
    }
  } else {
    const d = days === "7" ? 7 : 30;
    conditions.push(
      sql`${messageFeedbacks.createdAt} >= now() - (${d} * interval '1 day')`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** Build date condition for the period immediately before the current window. */
function buildPrevChatDateCondition(params: DashboardOverviewParams) {
  const { days, year, month } = params;
  const conditions = [];

  if (year) {
    const y = parseInt(year);
    if (month) {
      const m = parseInt(month);
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      conditions.push(sql`extract(year from ${chats.createdAt}) = ${prevY}`);
      conditions.push(sql`extract(month from ${chats.createdAt}) = ${prevM}`);
    } else {
      conditions.push(sql`extract(year from ${chats.createdAt}) = ${y - 1}`);
    }
  } else {
    const d = days === "7" ? 7 : 30;
    const d2 = d * 2;
    conditions.push(sql`${chats.createdAt} >= now() - (${d2} * interval '1 day')`);
    conditions.push(sql`${chats.createdAt} < now() - (${d} * interval '1 day')`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildPrevFeedbackDateCondition(params: DashboardOverviewParams) {
  const { days, year, month } = params;
  const conditions = [];

  if (year) {
    const y = parseInt(year);
    if (month) {
      const m = parseInt(month);
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      conditions.push(sql`extract(year from ${messageFeedbacks.createdAt}) = ${prevY}`);
      conditions.push(sql`extract(month from ${messageFeedbacks.createdAt}) = ${prevM}`);
    } else {
      conditions.push(sql`extract(year from ${messageFeedbacks.createdAt}) = ${y - 1}`);
    }
  } else {
    const d = days === "7" ? 7 : 30;
    const d2 = d * 2;
    conditions.push(sql`${messageFeedbacks.createdAt} >= now() - (${d2} * interval '1 day')`);
    conditions.push(sql`${messageFeedbacks.createdAt} < now() - (${d} * interval '1 day')`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** year-only → monthly buckets; everything else (days / year+month) → daily */
function resolvePeriodGranularity(params: DashboardOverviewParams) {
  const byMonth = !!params.year && !params.month;
  return {
    truncUnit: byMonth ? "month" : "day",
    dateFormat: byMonth ? "YYYY-MM" : "YYYY-MM-DD",
  } as const;
}

// ---------------------------------------------------------------------------
// Overview — aggregate totals
// ---------------------------------------------------------------------------

export async function getDashboardOverviewSummary(
  params: DashboardOverviewParams,
) {
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

export async function getDashboardOverviewIntents(
  params: DashboardOverviewParams,
) {
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

export async function getDashboardOverviewLikeRate(
  params: DashboardOverviewParams,
) {
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

export async function getDashboardOverviewSummaryPrev(
  params: DashboardOverviewParams,
) {
  const where = buildPrevChatDateCondition(params);

  const result = await db
    .select({
      totalChats: sql<number>`count(${chats.id})::int`,
      resolvedChats: sql<number>`sum(case when ${chats.isResolved} = true then 1 else 0 end)::int`,
    })
    .from(chats)
    .where(where);

  return result[0];
}

export async function getDashboardOverviewLikeRatePrev(
  params: DashboardOverviewParams,
) {
  const where = buildPrevFeedbackDateCondition(params);

  const result = await db
    .select({
      likes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'like' then 1 else 0 end)::int`,
      total: sql<number>`count(${messageFeedbacks.id})::int`,
    })
    .from(messageFeedbacks)
    .where(where);

  return result[0];
}

// ---------------------------------------------------------------------------
// Overview — trend (time-series for line charts)
// ---------------------------------------------------------------------------

export async function getOverviewTrendChats(params: DashboardOverviewParams) {
  const where = buildChatDateCondition(params);
  const { truncUnit, dateFormat } = resolvePeriodGranularity(params);
  const periodChunk = sql<string>`to_char(date_trunc(${sql.raw(`'${truncUnit}'`)}, ${chats.createdAt}), ${sql.raw(`'${dateFormat}'`)})`;

  const result = await db
    .select({
      period: periodChunk,
      totalChats: sql<number>`count(${chats.id})::int`,
      resolvedChats: sql<number>`sum(case when ${chats.isResolved} = true then 1 else 0 end)::int`,
    })
    .from(chats)
    .where(where)
    .groupBy(periodChunk)
    .orderBy(periodChunk);

  return result;
}

export async function getOverviewTrendFeedbacks(
  params: DashboardOverviewParams,
) {
  const where = buildFeedbackDateCondition(params);
  const { truncUnit, dateFormat } = resolvePeriodGranularity(params);
  const periodChunk = sql<string>`to_char(date_trunc(${sql.raw(`'${truncUnit}'`)}, ${messageFeedbacks.createdAt}), ${sql.raw(`'${dateFormat}'`)})`;

  const result = await db
    .select({
      period: periodChunk,
      likes: sql<number>`sum(case when ${messageFeedbacks.feedback} = 'like' then 1 else 0 end)::int`,
      total: sql<number>`count(${messageFeedbacks.id})::int`,
    })
    .from(messageFeedbacks)
    .where(where)
    .groupBy(periodChunk)
    .orderBy(periodChunk);

  return result;
}

// ---------------------------------------------------------------------------
// Session-intent
// ---------------------------------------------------------------------------

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

export async function getUserMessageContents(
  params: DashboardOverviewParams,
): Promise<string[]> {
  const { days, year, month } = params;
  const chatConditions = [];

  if (year) {
    chatConditions.push(
      sql`extract(year from ${chats.createdAt}) = ${parseInt(year)}`,
    );
    if (month) {
      chatConditions.push(
        sql`extract(month from ${chats.createdAt}) = ${parseInt(month)}`,
      );
    }
  } else {
    const d = days === "7" ? 7 : 30;
    chatConditions.push(
      sql`${chats.createdAt} >= now() - (${d} * interval '1 day')`,
    );
  }

  const result = await db
    .select({ content: messages.content })
    .from(messages)
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(
      and(
        eq(messages.senderType, "user"),
        chatConditions.length > 0 ? and(...chatConditions) : undefined,
      ),
    );

  return result
    .map((r) => r.content)
    .filter((c): c is string => typeof c === "string" && c.length > 0);
}

// ---------------------------------------------------------------------------
// Feedback / CSAT
// ---------------------------------------------------------------------------

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

export async function getFeedbackOverallPrev(params: DashboardOverviewParams) {
  const where = buildPrevFeedbackDateCondition(params);

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
  const where = buildFeedbackDateCondition(params);
  const { truncUnit, dateFormat } = resolvePeriodGranularity(params);
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

// ---------------------------------------------------------------------------
// API Request Logs — write + read
// ---------------------------------------------------------------------------

export async function insertApiRequestLog(
  input: InsertApiRequestLogInput,
): Promise<void> {
  await db.insert(apiRequestLogs).values({
    endpoint: input.endpoint,
    chatId: input.chatId ?? null,
    requestId: input.requestId ?? null,
    method: input.method,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    isError: input.isError,
    errorMessage: input.errorMessage ?? null,
  });
}

function buildApiLogDateCondition(params: DashboardOverviewParams) {
  const { days, year, month } = params;
  const conditions = [];

  if (year) {
    conditions.push(
      sql`extract(year from ${apiRequestLogs.createdAt}) = ${parseInt(year)}`,
    );
    if (month) {
      conditions.push(
        sql`extract(month from ${apiRequestLogs.createdAt}) = ${parseInt(month)}`,
      );
    }
  } else {
    const d = days ? parseInt(days) || 30 : 30;
    conditions.push(
      sql`${apiRequestLogs.createdAt} >= now() - (${d} * interval '1 day')`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getPerformanceSummaryOverall(
  params: DashboardOverviewParams,
) {
  const where = buildApiLogDateCondition(params);

  const result = await db
    .select({
      totalRequests: sql<number>`count(${apiRequestLogs.id})::int`,
      avgResponseMs: sql<number>`round(avg(${apiRequestLogs.durationMs}))::int`,
      p50Ms: sql<number>`percentile_cont(0.5) within group (order by ${apiRequestLogs.durationMs})::int`,
      p95Ms: sql<number>`percentile_cont(0.95) within group (order by ${apiRequestLogs.durationMs})::int`,
      errorCount: sql<number>`sum(case when ${apiRequestLogs.isError} = true then 1 else 0 end)::int`,
      errorRate: sql<string>`round(sum(case when ${apiRequestLogs.isError} = true then 1 else 0 end) * 100.0 / nullif(count(${apiRequestLogs.id}), 0), 2)`,
    })
    .from(apiRequestLogs)
    .where(where);

  return result[0];
}

export async function getPerformanceByEndpoint(
  params: DashboardOverviewParams,
) {
  const where = buildApiLogDateCondition(params);

  const result = await db
    .select({
      endpoint: apiRequestLogs.endpoint,
      totalRequests: sql<number>`count(${apiRequestLogs.id})::int`,
      avgResponseMs: sql<number>`round(avg(${apiRequestLogs.durationMs}))::int`,
      p95Ms: sql<number>`percentile_cont(0.95) within group (order by ${apiRequestLogs.durationMs})::int`,
      errorCount: sql<number>`sum(case when ${apiRequestLogs.isError} = true then 1 else 0 end)::int`,
      errorRate: sql<string>`round(sum(case when ${apiRequestLogs.isError} = true then 1 else 0 end) * 100.0 / nullif(count(${apiRequestLogs.id}), 0), 2)`,
    })
    .from(apiRequestLogs)
    .where(where)
    .groupBy(apiRequestLogs.endpoint)
    .orderBy(apiRequestLogs.endpoint);

  return result;
}

export async function getPerformanceTrend(params: DashboardOverviewParams) {
  const where = buildApiLogDateCondition(params);
  const { truncUnit, dateFormat } = resolvePeriodGranularity(params);
  const periodChunk = sql<string>`to_char(date_trunc(${sql.raw(`'${truncUnit}'`)}, ${apiRequestLogs.createdAt}), ${sql.raw(`'${dateFormat}'`)})`;

  const result = await db
    .select({
      period: periodChunk,
      avgResponseMs: sql<number>`round(avg(${apiRequestLogs.durationMs}))::int`,
      requestCount: sql<number>`count(${apiRequestLogs.id})::int`,
      errorCount: sql<number>`sum(case when ${apiRequestLogs.isError} = true then 1 else 0 end)::int`,
      errorRate: sql<string>`round(sum(case when ${apiRequestLogs.isError} = true then 1 else 0 end) * 100.0 / nullif(count(${apiRequestLogs.id}), 0), 2)`,
    })
    .from(apiRequestLogs)
    .where(where)
    .groupBy(periodChunk)
    .orderBy(periodChunk);

  return result;
}
