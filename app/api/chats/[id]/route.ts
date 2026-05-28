import { continueChatStream } from "@/modules/chats/service";
import { getMessagesByChatId } from "@/modules/messages/repository";
import { NextRequest } from "next/server";
import { buildSuccessResponse, buildFailedResponse } from "@/lib/utils/response";
import { toAgenticEventStreamResponse } from "@/lib/ai/rag";
import { getModuleLogger } from "@/lib/logger";

const log = getModuleLogger("api/chats/[id]");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await params;
  const reqLog = log.child({ request_id: requestId, method: "GET", path: `/api/chats/${id}`, chatId: id });

  reqLog.debug({}, "chat.history_requested");

  try {
    const messages = await getMessagesByChatId(id);
    reqLog.info({ status: 200, messageCount: messages.length, duration: Date.now() - start }, "chat.history_fetched");
    return buildSuccessResponse({ chatId: id, messages }, "Histori chat berhasil diambil", 200);
  } catch (error: unknown) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "chat.history_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await params;
  const reqLog = log.child({ request_id: requestId, method: "POST", path: `/api/chats/${id}`, chatId: id });

  reqLog.debug({}, "chat.continue_start");

  try {
    const body = await req.json();

    let question = body.question;
    if (!question && body.messages && body.messages.length > 0) {
      question = body.messages[body.messages.length - 1].content;
    }

    if (!question) {
      reqLog.warn({ status: 400, duration: Date.now() - start }, "chat.continue_rejected");
      return buildFailedResponse("Pertanyaan diperlukan", null, 400);
    }

    reqLog.info({ questionLength: question.length }, "chat.continue_initiated");
    const result = await continueChatStream(id, question);

    reqLog.info({ chatId: result.chatId, status: 200, duration: Date.now() - start }, "chat.continue_started");
    return toAgenticEventStreamResponse(result.streamResult, {
      "x-chat-id": result.chatId,
    });
  } catch (error: unknown) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "chat.continue_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
