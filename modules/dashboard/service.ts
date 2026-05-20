import {
  getDashboardCompletionRate,
  getDashboardTopIntents,
  getDashboardFeedbackStats,
  getDashboardOverviewSummary,
  getDashboardOverviewIntents,
  getDashboardOverviewLikeRate,
  getSessionAnalysisStats,
  getUserMessageContents,
  getFeedbackOverall,
  getFeedbackByIntent,
  getFeedbackTrend,
  DashboardStatsParams,
  DashboardOverviewParams,
} from "./repository";

const STOP_WORDS = new Set([
  // common Indonesian filler / function words
  "yang", "dan", "atau", "dengan", "untuk", "dari", "pada", "ini", "itu", "juga",
  "adalah", "ada", "saya", "anda", "bisa", "akan", "sudah", "tidak", "belum",
  "saja", "lebih", "agar", "kami", "kita", "mereka", "dapat", "harus", "perlu",
  "cara", "bagaimana", "apakah", "kenapa", "kapan", "dimana", "siapa", "berapa",
  "ingin", "tahu", "tentang", "tolong", "bantu", "mohon", "terima", "kasih",
  "halo", "hello", "selamat", "pagi", "siang", "malam", "sore", "hari",
  "jika", "maka", "namun", "tetapi", "tapi", "karena", "sebab", "oleh",
  "seperti", "dalam", "antara", "lain", "masih", "telah", "pernah",
  "apabila", "bagi", "kamu", "kalian", "serta", "yaitu", "jadi",
  "suatu", "sebuah", "setiap", "semua", "setelah", "sebelum", "tanpa",
  "atas", "bawah", "sebagai", "apa", "lagi", "punya", "buat", "biasa",
  "banyak", "ketika", "saat", "cukup", "hanya", "kalau", "mau", "diri",
  "kata", "gimana", "gak", "nggak", "dong", "yuk", "deh", "sih",
  "oke", "okay", "iya", "nih", "loh", "dulu", "jangan", "jelas",
  "tapi", "dong", "banget", "sekali", "sangat", "sudah", "menjadi",
  "tolong", "butuh", "ingin", "minta", "mohon", "berarti", "karena",
]);

function processWordCloud(contents: string[]): { word: string; count: number }[] {
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

export async function getDashboardStats(params: DashboardStatsParams) {
  const completionData = await getDashboardCompletionRate(params);
  const intentsData = await getDashboardTopIntents(params);
  const feedbackData = await getDashboardFeedbackStats(params);

  const completionRate = completionData.map((row) => {
    const rate = row.totalChats > 0 ? (row.resolvedChats / row.totalChats) * 100 : 0;
    return {
      period: row.period,
      totalChats: row.totalChats,
      resolvedChats: row.resolvedChats,
      rate: Number(rate.toFixed(2))
    };
  });

  return {
    completionRate,
    topIntents: intentsData,
    feedbackStats: feedbackData,
  };
}

export async function getDashboardOverview(params: DashboardOverviewParams) {
  const [summary, intents, likeData] = await Promise.all([
    getDashboardOverviewSummary(params),
    getDashboardOverviewIntents(params),
    getDashboardOverviewLikeRate(params),
  ]);

  const completionRate =
    summary.totalChats > 0
      ? Number(((summary.resolvedChats / summary.totalChats) * 100).toFixed(2))
      : 0;

  const likePercentage =
    likeData.total > 0
      ? Number(((likeData.likes / likeData.total) * 100).toFixed(2))
      : 0;

  return {
    totalChats: summary.totalChats,
    completionRate,
    likePercentage,
    intents: intents.map((row) => ({
      intent: row.intent,
      count: row.count,
      percentage: Number(row.percentage),
    })),
  };
}

function computeCsat(likes: number, dislikes: number): number {
  const rated = likes + dislikes;
  return rated > 0 ? Number(((likes / rated) * 100).toFixed(2)) : 0;
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

export async function getDashboardSessionIntent(params: DashboardOverviewParams) {
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
