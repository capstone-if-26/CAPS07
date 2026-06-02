import { continueChatStream } from "@/modules/chats/service";
import { getMessagesByChatId } from "@/modules/messages/repository";
import { NextRequest, after } from "next/server";
import {
  buildSuccessResponse,
  buildFailedResponse,
} from "@/lib/utils/response";
import { toAgenticEventStreamResponse } from "@/lib/ai/rag";
import { getModuleLogger } from "@/lib/logger";
import { insertApiRequestLog } from "@/modules/dashboard/repository";

const log = getModuleLogger("api/chats/[id]");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await params;
  const reqLog = log.child({
    request_id: requestId,
    method: "GET",
    path: `/api/chats/${id}`,
    chatId: id,
  });

  reqLog.debug({}, "chat.history_requested");

  try {
    const messages = await getMessagesByChatId(id);
    reqLog.info(
      {
        status: 200,
        messageCount: messages.length,
        duration: Date.now() - start,
      },
      "chat.history_fetched",
    );
    return buildSuccessResponse(
      { chatId: id, messages },
      "Histori chat berhasil diambil",
      200,
    );
  } catch (error: unknown) {
    reqLog.error(
      { err: error, status: 500, duration: Date.now() - start },
      "chat.history_failed",
    );
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
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
  const reqLog = log.child({
    request_id: requestId,
    method: "POST",
    path: `/api/chats/${id}`,
    chatId: id,
  });

  reqLog.debug({}, "chat.continue_start");

  try {
    const body = await req.json();

    let question = body.question;
    if (!question && body.messages && body.messages.length > 0) {
      question = body.messages[body.messages.length - 1].content;
    }

    if (!question) {
      const duration = Date.now() - start;
      reqLog.warn({ status: 400, duration }, "chat.continue_rejected");
      after(async () => {
        await insertApiRequestLog({
          endpoint: "chat",
          chatId: id,
          requestId,
          method: "POST",
          statusCode: 400,
          durationMs: duration,
          isError: false,
        }).catch(() => {});
      });
      return buildFailedResponse("Pertanyaan diperlukan", null, 400);
    }

    reqLog.info({ questionLength: question.length }, "chat.continue_initiated");
    const result = await continueChatStream(id, question);
    const duration = Date.now() - start;

    reqLog.info({ chatId: id, status: 200, duration }, "chat.continue_started");
    insertApiRequestLog({
      endpoint: "chat",
      chatId: id,
      requestId,
      method: "POST",
      statusCode: 200,
      durationMs: duration,
      isError: false,
    }).catch((e) => reqLog.warn({ err: e }, "api_log.write_failed"));

    return toAgenticEventStreamResponse(result.streamResult, {
      "x-chat-id": result.chatId,
    });
  } catch (error: unknown) {
    const duration = Date.now() - start;
    reqLog.error({ err: error, status: 500, duration }, "chat.continue_failed");
    after(async () => {
      await insertApiRequestLog({
        endpoint: "chat",
        chatId: id,
        requestId,
        method: "POST",
        statusCode: 500,
        durationMs: duration,
        isError: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      }).catch(() => {});
    });
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
