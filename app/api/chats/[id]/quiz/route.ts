import { NextRequest } from "next/server";
import { buildSuccessResponse, buildFailedResponse } from "@/lib/utils/response";
import { startQuiz } from "@/modules/chats/service";
import { getModuleLogger } from "@/lib/logger";

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
    reqLog.info({ status: 200, duration: Date.now() - start }, "chat.quiz_generated");
    return buildSuccessResponse(quiz, "Quiz berhasil dibuat", 200);
  } catch (error) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "chat.quiz_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
