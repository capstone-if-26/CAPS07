import { startNewChatStream } from "@/modules/chats/service";
import { NextRequest, after } from "next/server";
import { auth } from "@/modules/auth/service";
import { buildSuccessResponse, buildFailedResponse } from "@/lib/utils/response";
import { toAgenticEventStreamResponse } from "@/lib/ai/rag";
import { getModuleLogger } from "@/lib/logger";
import { insertApiRequestLog } from "@/modules/dashboard/repository";

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
      const duration = Date.now() - start;
      reqLog.warn({ status: 400, duration }, "chat.stream_rejected");
      // Non-streaming path: after() is safe here
      after(async () => {
        await insertApiRequestLog({ endpoint: "chat", requestId, method: "POST", statusCode: 400, durationMs: duration, isError: false }).catch(() => {});
      });
      return buildFailedResponse("Pertanyaan (question/messages) diperlukan", null, 400);
    }

    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user?.id || null;

    reqLog.info({ userId, questionLength: question.length }, "chat.stream_initiated");
    const result = await startNewChatStream(userId, question);
    const duration = Date.now() - start;

    reqLog.info({ chatId: result.chatId, status: 200, duration }, "chat.stream_started");
    // Fire-and-forget: do NOT use after() for streaming responses.
    // after() only fires when the SSE stream is fully consumed (client disconnects),
    // which is unpredictable. The function is alive for the entire stream duration,
    // so a direct promise is reliable here.
    insertApiRequestLog({ endpoint: "chat", chatId: result.chatId, requestId, method: "POST", statusCode: 200, durationMs: duration, isError: false })
      .catch((e) => reqLog.warn({ err: e }, "api_log.write_failed"));

    return toAgenticEventStreamResponse(result.streamResult, {
      "x-chat-id": result.chatId,
    });
  } catch (error: unknown) {
    const duration = Date.now() - start;
    reqLog.error({ err: error, status: 500, duration }, "chat.stream_failed");
    after(async () => {
      await insertApiRequestLog({ endpoint: "chat", requestId, method: "POST", statusCode: 500, durationMs: duration, isError: true, errorMessage: error instanceof Error ? error.message : "Unknown error" }).catch(() => {});
    });
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
