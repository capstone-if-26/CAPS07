import { NextRequest, after } from "next/server";
import { buildFailedResponse, buildSuccessResponse } from "@/lib/utils/response";
import { generateChatIntentSummary, normalizeClientMessageSnapshot } from "@/modules/chats/service";
import { getModuleLogger } from "@/lib/utils/logger";
import { insertApiRequestLog } from "@/modules/dashboard/repository";

const log = getModuleLogger("api/chats/[id]/summary");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id: chatId } = await params;
  const reqLog = log.child({ request_id: requestId, method: "POST", path: `/api/chats/${chatId}/summary`, chatId });

  reqLog.debug({}, "chat.summary_requested");

  try {
    if (!chatId) {
      const duration = Date.now() - start;
      reqLog.warn({ status: 400, duration }, "chat.summary_rejected");
      return buildFailedResponse("Chat ID diperlukan", null, 400);
    }

    let clientMessages = undefined;
    try {
      const body: unknown = await req.json();
      if (body && typeof body === "object" && body !== null && "messages" in body) {
        clientMessages = normalizeClientMessageSnapshot(
          (body as { messages: unknown }).messages,
        );
      }
    } catch {
      /* empty or non-JSON body */
    }

    const result = await generateChatIntentSummary(chatId, { clientMessages });
    const duration = Date.now() - start;

    reqLog.info({ intent: result.intent, status: 200, duration }, "chat.summary_generated");
    after(async () => {
      await insertApiRequestLog({ endpoint: "summary", chatId, requestId, method: "POST", statusCode: 200, durationMs: duration, isError: false }).catch(() => {});
    });

    return buildSuccessResponse(result, "Ringkasan intent berhasil dibuat", 200);
  } catch (error: unknown) {
    const duration = Date.now() - start;
    reqLog.error({ err: error, status: 500, duration }, "chat.summary_failed");
    after(async () => {
      await insertApiRequestLog({ endpoint: "summary", chatId, requestId, method: "POST", statusCode: 500, durationMs: duration, isError: true, errorMessage: error instanceof Error ? error.message : "Unknown error" }).catch(() => {});
    });
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
