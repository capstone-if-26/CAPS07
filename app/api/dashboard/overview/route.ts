import { NextRequest } from 'next/server';
import { buildFailedResponse, buildSuccessResponse } from '@/lib/utils/response';
import { getDashboardOverview } from '@/modules/dashboard/service';
import { DashboardOverviewParams } from '@/modules/dashboard/repository';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const days = searchParams.get('days') || undefined;
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;

    const params: DashboardOverviewParams = { days, year, month };

    const overview = await getDashboardOverview(params);

    return buildSuccessResponse(overview, "Berhasil mengambil overview dashboard", 200);
  } catch (error: unknown) {
    let message = 'Terjadi kesalahan internal';
    if (error instanceof Error) {
      message = error.message;
    }
    return buildFailedResponse(message, error, 500);
  }
}
