import {
  getDashboardOverviewSummary,
  getDashboardOverviewIntents,
  getDashboardOverviewLikeRate,
  getOverviewTrendChats,
  getOverviewTrendFeedbacks,
  getSessionAnalysisStats,
  getUserMessageContents,
  getFeedbackOverall,
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
// Service functions
// ---------------------------------------------------------------------------

export async function getDashboardOverview(params: DashboardOverviewParams) {
  const [summary, intents, likeData, trendChats, trendFeedbacks] =
    await Promise.all([
      getDashboardOverviewSummary(params),
      getDashboardOverviewIntents(params),
      getDashboardOverviewLikeRate(params),
      getOverviewTrendChats(params),
      getOverviewTrendFeedbacks(params),
    ]);

  const completionRate =
    summary.totalChats > 0
      ? Number(((summary.resolvedChats / summary.totalChats) * 100).toFixed(2))
      : 0;

  const likePercentage =
    likeData.total > 0
      ? Number(((likeData.likes / likeData.total) * 100).toFixed(2))
      : 0;

  // Merge chat trend with feedback trend keyed on period
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
    completionRate,
    likePercentage,
    intents: intents.map((row) => ({
      intent: row.intent,
      count: row.count,
      percentage: Number(row.percentage),
    })),
    trend,
  };
}

export async function getDashboardFeedback(params: DashboardOverviewParams) {
  const [overall, byIntent, trend] = await Promise.all([
    getFeedbackOverall(params),
    getFeedbackByIntent(params),
    getFeedbackTrend(params),
  ]);

  const totalFeedback = overall.likes + overall.dislikes;
  const csat = computeCsat(overall.likes, overall.dislikes);

  return {
    csat,
    totalFeedback,
    likes: overall.likes,
    dislikes: overall.dislikes,
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
