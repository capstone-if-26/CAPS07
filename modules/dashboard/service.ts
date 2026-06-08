import {
  getDashboardOverviewSummary,
  getDashboardOverviewSummaryPrev,
  getDashboardOverviewIntents,
  getDashboardOverviewLikeRate,
  getDashboardOverviewLikeRatePrev,
  getOverviewTrendChats,
  getOverviewTrendFeedbacks,
  getSessionAnalysisStats,
  getUserMessageContents,
  getFeedbackOverall,
  getFeedbackOverallPrev,
  getFeedbackByIntent,
  getFeedbackTrend,
  getPerformanceSummaryOverall,
  getPerformanceByEndpoint,
  getPerformanceTrend,
} from "./repository";

import { DashboardOverviewParams } from "./type";

// ---------------------------------------------------------------------------
// Word cloud helpers
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "yang",
  "dan",
  "atau",
  "dengan",
  "untuk",
  "dari",
  "pada",
  "ini",
  "itu",
  "juga",
  "adalah",
  "ada",
  "saya",
  "anda",
  "bisa",
  "akan",
  "sudah",
  "tidak",
  "belum",
  "saja",
  "lebih",
  "agar",
  "kami",
  "kita",
  "mereka",
  "dapat",
  "harus",
  "perlu",
  "cara",
  "bagaimana",
  "apakah",
  "kenapa",
  "kapan",
  "dimana",
  "siapa",
  "berapa",
  "ingin",
  "tahu",
  "tentang",
  "tolong",
  "bantu",
  "mohon",
  "terima",
  "kasih",
  "halo",
  "hello",
  "selamat",
  "pagi",
  "siang",
  "malam",
  "sore",
  "hari",
  "jika",
  "maka",
  "namun",
  "tetapi",
  "tapi",
  "karena",
  "sebab",
  "oleh",
  "seperti",
  "dalam",
  "antara",
  "lain",
  "masih",
  "telah",
  "pernah",
  "apabila",
  "bagi",
  "kamu",
  "kalian",
  "serta",
  "yaitu",
  "jadi",
  "suatu",
  "sebuah",
  "setiap",
  "semua",
  "setelah",
  "sebelum",
  "tanpa",
  "atas",
  "bawah",
  "sebagai",
  "apa",
  "lagi",
  "punya",
  "buat",
  "biasa",
  "banyak",
  "ketika",
  "saat",
  "cukup",
  "hanya",
  "kalau",
  "mau",
  "diri",
  "kata",
  "gimana",
  "gak",
  "nggak",
  "dong",
  "yuk",
  "deh",
  "sih",
  "oke",
  "okay",
  "iya",
  "nih",
  "loh",
  "dulu",
  "jangan",
  "jelas",
  "banget",
  "sekali",
  "sangat",
  "menjadi",
  "butuh",
  "minta",
  "berarti",
]);

function processWordCloud(
  contents: string[],
): { word: string; count: number }[] {
  const freq = new Map<string, number>();

  for (const content of contents) {
    const words = content
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

// ---------------------------------------------------------------------------
// CSAT helper
// ---------------------------------------------------------------------------

function computeCsat(likes: number, dislikes: number): number {
  const rated = likes + dislikes;
  return rated > 0 ? Number(((likes / rated) * 100).toFixed(2)) : 0;
}

// ---------------------------------------------------------------------------
// Satisfaction tier helper
// ---------------------------------------------------------------------------

const SATISFACTION_TIERS = [
  { level: "sangat_puas", label: "Sangat Puas", minThreshold: 70 },
  { level: "puas",        label: "Puas",        minThreshold: 50 },
  { level: "cukup",       label: "Cukup",       minThreshold: 30 },
  { level: "kurang",      label: "Kurang",       minThreshold: 0  },
] as const;

type SatisfactionLevel = (typeof SATISFACTION_TIERS)[number]["level"];

function getSatisfactionInfo(likePercentage: number): {
  level: SatisfactionLevel;
  label: string;
  minThreshold: number;
} {
  return (
    SATISFACTION_TIERS.find((t) => likePercentage >= t.minThreshold) ??
    SATISFACTION_TIERS[SATISFACTION_TIERS.length - 1]
  );
}

// ---------------------------------------------------------------------------
// Percentage change helpers
// ---------------------------------------------------------------------------

/** Relative change: (curr - prev) / prev × 100. Returns null when prev = 0. */
function relativeChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Number((((curr - prev) / prev) * 100).toFixed(2));
}

/** Absolute percentage-point difference. */
function pointChange(curr: number, prev: number): number {
  return Number((curr - prev).toFixed(2));
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getDashboardOverview(params: DashboardOverviewParams) {
  const [
    summary, prevSummary,
    intents,
    likeData, prevLikeData,
    trendChats, trendFeedbacks,
  ] = await Promise.all([
    getDashboardOverviewSummary(params),
    getDashboardOverviewSummaryPrev(params),
    getDashboardOverviewIntents(params),
    getDashboardOverviewLikeRate(params),
    getDashboardOverviewLikeRatePrev(params),
    getOverviewTrendChats(params),
    getOverviewTrendFeedbacks(params),
  ]);

  // ── Current period rates ──────────────────────────────────────────────────
  const completionRate =
    summary.totalChats > 0
      ? Number(((summary.resolvedChats / summary.totalChats) * 100).toFixed(2))
      : 0;

  const likePercentage =
    likeData.total > 0
      ? Number(((likeData.likes / likeData.total) * 100).toFixed(2))
      : 0;

  // ── Previous period rates ─────────────────────────────────────────────────
  const prevCompletionRate =
    prevSummary.totalChats > 0
      ? Number(((prevSummary.resolvedChats / prevSummary.totalChats) * 100).toFixed(2))
      : 0;

  // ── Changes ───────────────────────────────────────────────────────────────
  const totalChatsChange = relativeChange(summary.totalChats, prevSummary.totalChats);
  const completionRateChange = pointChange(completionRate, prevCompletionRate);

  // ── Satisfaction tier ─────────────────────────────────────────────────────
  const satisfaction = getSatisfactionInfo(likePercentage);

  // ── Trend (merge chat + feedback by period) ───────────────────────────────
  const feedbackByPeriod = new Map(trendFeedbacks.map((r) => [r.period, r]));

  const trend = trendChats.map((r) => {
    const fb = feedbackByPeriod.get(r.period);
    return {
      period: r.period,
      totalChats: r.totalChats,
      completionRate:
        r.totalChats > 0
          ? Number(((r.resolvedChats / r.totalChats) * 100).toFixed(2))
          : 0,
      likePercentage:
        fb && fb.total > 0
          ? Number(((fb.likes / fb.total) * 100).toFixed(2))
          : 0,
    };
  });

  return {
    totalChats: summary.totalChats,
    resolvedChats: summary.resolvedChats,
    totalChatsChange,
    completionRate,
    completionRateChange,
    likePercentage,
    satisfactionLevel: satisfaction.level,
    satisfactionLabel: satisfaction.label,
    satisfactionThreshold: satisfaction.minThreshold,
    intents: intents.map((row) => ({
      intent: row.intent,
      count: row.count,
      percentage: Number(row.percentage),
    })),
    trend,
  };
}

export async function getDashboardFeedback(params: DashboardOverviewParams) {
  const [overall, prevOverall, byIntent, trend] = await Promise.all([
    getFeedbackOverall(params),
    getFeedbackOverallPrev(params),
    getFeedbackByIntent(params),
    getFeedbackTrend(params),
  ]);

  const totalFeedback = overall.likes + overall.dislikes;
  const prevTotalFeedback = prevOverall.likes + prevOverall.dislikes;

  const csat = computeCsat(overall.likes, overall.dislikes);
  const prevCsat = computeCsat(prevOverall.likes, prevOverall.dislikes);

  const likeRate =
    totalFeedback > 0
      ? Number(((overall.likes / totalFeedback) * 100).toFixed(2))
      : 0;
  const dislikeRate =
    totalFeedback > 0
      ? Number(((overall.dislikes / totalFeedback) * 100).toFixed(2))
      : 0;

  return {
    csat,
    csatChange: relativeChange(csat, prevCsat),
    totalFeedback,
    totalFeedbackChange: relativeChange(totalFeedback, prevTotalFeedback),
    likes: overall.likes,
    dislikes: overall.dislikes,
    likeRate,
    dislikeRate,
    csatByIntent: byIntent.map((row) => ({
      intent: row.intent,
      likes: row.likes,
      dislikes: row.dislikes,
      total: row.likes + row.dislikes,
      csat: computeCsat(row.likes, row.dislikes),
    })),
    trend: trend.map((row) => ({
      period: row.period,
      likes: row.likes,
      dislikes: row.dislikes,
    })),
  };
}

export async function getDashboardSessionIntent(
  params: DashboardOverviewParams,
) {
  const [intents, sessionAnalysis, messageContents] = await Promise.all([
    getDashboardOverviewIntents(params),
    getSessionAnalysisStats(params),
    getUserMessageContents(params),
  ]);

  return {
    intents: intents.map((row) => ({
      intent: row.intent,
      count: row.count,
      percentage: Number(row.percentage),
    })),
    wordCloud: processWordCloud(messageContents),
    sessionAnalysis: {
      totalSessions: sessionAnalysis.totalSessions,
      withIntent: sessionAnalysis.withIntent,
      withContact: sessionAnalysis.withContact,
      dropOff: sessionAnalysis.dropOff,
    },
  };
}

// Human-readable labels for each endpoint key
const ENDPOINT_LABELS: Record<string, string> = {
  chat: "Chat",
  quiz: "Quiz",
  summary: "Ringkasan",
};

export async function getDashboardPerformance(params: DashboardOverviewParams) {
  const [overall, byEndpoint, trend] = await Promise.all([
    getPerformanceSummaryOverall(params),
    getPerformanceByEndpoint(params),
    getPerformanceTrend(params),
  ]);

  return {
    summary: {
      totalRequests: overall.totalRequests ?? 0,
      avgResponseMs: overall.avgResponseMs ?? 0,
      p50Ms: overall.p50Ms ?? 0,
      p95Ms: overall.p95Ms ?? 0,
      errorCount: overall.errorCount ?? 0,
      errorRate: Number(overall.errorRate ?? 0),
    },
    byEndpoint: byEndpoint.map((row) => ({
      endpoint: row.endpoint,
      label: ENDPOINT_LABELS[row.endpoint] ?? row.endpoint,
      totalRequests: row.totalRequests,
      avgResponseMs: row.avgResponseMs ?? 0,
      p95Ms: row.p95Ms ?? 0,
      errorCount: row.errorCount,
      errorRate: Number(row.errorRate ?? 0),
    })),
    trend: trend.map((row) => ({
      period: row.period,
      avgResponseMs: row.avgResponseMs ?? 0,
      requestCount: row.requestCount,
      errorCount: row.errorCount,
      errorRate: Number(row.errorRate ?? 0),
    })),
  };
}
