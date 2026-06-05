import { NextRequest, after } from "next/server";
import { buildSuccessResponse, buildFailedResponse } from "@/lib/utils/response";
import { startQuiz } from "@/modules/chats/service";
import { getModuleLogger } from "@/lib/utils/logger";
import { insertApiRequestLog } from "@/modules/dashboard/repository";

const log = getModuleLogger("api/chats/[id]/quiz");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await params;
  const reqLog = log.child({ request_id: requestId, method: "GET", path: `/api/chats/${id}/quiz`, chatId: id });

  reqLog.debug({}, "chat.quiz_requested");

  try {
    const quiz = await startQuiz(id);
    const duration = Date.now() - start;

    reqLog.info({ status: 200, duration }, "chat.quiz_generated");
    after(async () => {
      await insertApiRequestLog({ endpoint: "quiz", chatId: id, requestId, method: "GET", statusCode: 200, durationMs: duration, isError: false }).catch(() => {});
    });

    return buildSuccessResponse(quiz, "Quiz berhasil dibuat", 200);
  } catch (error) {
    const duration = Date.now() - start;
    reqLog.error({ err: error, status: 500, duration }, "chat.quiz_failed");
    after(async () => {
      await insertApiRequestLog({ endpoint: "quiz", chatId: id, requestId, method: "GET", statusCode: 500, durationMs: duration, isError: true, errorMessage: error instanceof Error ? error.message : "Unknown error" }).catch(() => {});
    });
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
