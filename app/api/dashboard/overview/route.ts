import { NextRequest } from "next/server";
import {
  buildFailedResponse,
  buildSuccessResponse,
} from "@/lib/utils/response";
import { getDashboardOverview } from "@/modules/dashboard/service";
import { DashboardOverviewParams } from "@/modules/dashboard/type";
import { getModuleLogger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/utils/auth-guard";

const log = getModuleLogger("api/dashboard/overview");

export async function GET(req: NextRequest) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const reqLog = log.child({
    request_id: requestId,
    method: "GET",
    path: "/api/dashboard/overview",
  });

  const { errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  reqLog.debug({}, "dashboard.overview_requested");

  try {
    const searchParams = req.nextUrl.searchParams;
    const days = searchParams.get("days") || undefined;
    const year = searchParams.get("year") || undefined;
    const month = searchParams.get("month") || undefined;

    const params: DashboardOverviewParams = { days, year, month };
    const overview = await getDashboardOverview(params);

    reqLog.info(
      { days, year, month, status: 200, duration: Date.now() - start },
      "dashboard.overview_fetched",
    );
    return buildSuccessResponse(
      overview,
      "Berhasil mengambil overview dashboard",
      200,
    );
  } catch (error: unknown) {
    reqLog.error(
      { err: error, status: 500, duration: Date.now() - start },
      "dashboard.overview_failed",
    );
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
