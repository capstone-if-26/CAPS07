import { getMessageById } from "@/modules/messages/repository";
import { continueChatStream } from "@/modules/chats/service";
import { NextRequest } from "next/server";
import { buildSuccessResponse, buildFailedResponse } from "@/lib/utils/response";
import { toAgenticEventStreamResponse } from "@/lib/ai/rag";
import { getModuleLogger } from "@/lib/logger";

const log = getModuleLogger("api/chats/[id]/messages");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await params;
  const reqLog = log.child({ request_id: requestId, method: "GET", path: `/api/chats/${id}/messages`, messageId: id });

  reqLog.debug({}, "message.fetch_requested");

  try {
    const message = await getMessageById(id);

    if (!message) {
      reqLog.warn({ status: 404, duration: Date.now() - start }, "message.not_found");
      return buildFailedResponse("Pesan tidak ditemukan", null, 404);
    }

    reqLog.info({ status: 200, duration: Date.now() - start }, "message.fetched");
    return buildSuccessResponse({ message }, "Pesan berhasil diambil", 200);
  } catch (error: unknown) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "message.fetch_failed");
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
  const { id: chatId } = await params;
  const reqLog = log.child({ request_id: requestId, method: "POST", path: `/api/chats/${chatId}/messages`, chatId });

  reqLog.debug({}, "chat.continue_via_messages_start");

  try {
    const body = await req.json();

    let question = body.question;
    if (!question && body.messages && body.messages.length > 0) {
      question = body.messages[body.messages.length - 1].content;
    }

    if (!question) {
      reqLog.warn({ status: 400, duration: Date.now() - start }, "chat.continue_rejected");
      return buildFailedResponse("Pertanyaan (question/messages) diperlukan", null, 400);
    }

    reqLog.info({ questionLength: question.length }, "chat.continue_initiated");
    const result = await continueChatStream(chatId, question);

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
