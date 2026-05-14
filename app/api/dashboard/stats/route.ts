import { NextRequest } from 'next/server';
import { buildFailedResponse, buildSuccessResponse } from '@/lib/utils/response';
import { getDashboardStats } from '@/modules/dashboard/service';
import { DashboardStatsParams } from '@/modules/dashboard/repository';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;
    const groupByParam = searchParams.get('groupBy');

    let groupBy: "month" | "year" = "month";
    if (groupByParam === "year" || groupByParam === "month") {
      groupBy = groupByParam;
    } else if (year && !month) {
      groupBy = "month";
    }

    const params: DashboardStatsParams = {
      year,
      month,
      groupBy
    };

    const stats = await getDashboardStats(params);

    return buildSuccessResponse(stats, "Berhasil mengambil statistik chat", 200);
  } catch (error: unknown) {
    let message = 'Terjadi kesalahan internal';
    if (error instanceof Error) {
      message = error.message;
    }
    return buildFailedResponse(message, error, 500);
  }
}
