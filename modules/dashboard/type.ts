export type InsertApiRequestLogInput = {
  endpoint: string;
  chatId?: string;
  requestId?: string;
  method: string;
  statusCode: number;
  durationMs: number;
  isError: boolean;
  errorMessage?: string;
};

export type DashboardOverviewParams = {
  days?: string; // "7" or "30", default "30"
  year?: string;
  month?: string;
};
