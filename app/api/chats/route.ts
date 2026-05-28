import { startNewChatStream } from "@/modules/chats/service";
import { NextRequest } from "next/server";
import { auth } from "@/modules/auth/service";
import { buildSuccessResponse, buildFailedResponse } from "@/lib/utils/response";
import { toAgenticEventStreamResponse } from "@/lib/ai/rag";
import { getModuleLogger } from "@/lib/logger";

const log = getModuleLogger("api/chats");

export async function POST(req: NextRequest) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const reqLog = log.child({ request_id: requestId, method: "POST", path: "/api/chats" });

  reqLog.debug({}, "chat.stream_start");

  try {
    const body = await req.json();

    let question = body.question;
    if (!question && body.messages && body.messages.length > 0) {
      question = body.messages[body.messages.length - 1].content;
    }

    if (!question) {
      reqLog.warn({ status: 400, duration: Date.now() - start }, "chat.stream_rejected");
      return buildFailedResponse("Pertanyaan (question/messages) diperlukan", null, 400);
    }

    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user?.id || null;

    reqLog.info({ userId, questionLength: question.length }, "chat.stream_initiated");
    const result = await startNewChatStream(userId, question);

    reqLog.info({ chatId: result.chatId, status: 200, duration: Date.now() - start }, "chat.stream_started");
    return toAgenticEventStreamResponse(result.streamResult, {
      "x-chat-id": result.chatId,
    });
  } catch (error: unknown) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "chat.stream_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function GET() {
  return buildSuccessResponse(
    { status: "active" },
    "Endpoint POST /api/chats siap melayani stream agentic RAG",
    200,
  );
}
