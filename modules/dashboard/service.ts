import { getDashboardCompletionRate, getDashboardTopIntents, getDashboardFeedbackStats, DashboardStatsParams } from "./repository";

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
