import { NextRequest } from "next/server";
import { buildFailedResponse, buildSuccessResponse } from "@/lib/utils/response";
import { upsertMessageFeedback, getMessageById } from "@/modules/messages/repository";
import { getModuleLogger } from "@/lib/utils/logger";

const log = getModuleLogger("api/messages/[id]/feedback");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await params;
  const reqLog = log.child({ request_id: requestId, method: "POST", path: `/api/messages/${id}/feedback`, messageId: id });

  reqLog.debug({}, "message.feedback_requested");

  try {
    const body = await req.json();

    if (!["like", "dislike", "none"].includes(body.feedback)) {
      reqLog.warn({ feedback: body.feedback, status: 400, duration: Date.now() - start }, "message.feedback_rejected");
      return buildFailedResponse(
        "Field feedback harus bernilai 'like', 'dislike', atau 'none'",
        null,
        400,
      );
    }

    const message = await getMessageById(id);
    if (!message) {
      reqLog.warn({ status: 404, duration: Date.now() - start }, "message.not_found");
      return buildFailedResponse("Pesan tidak ditemukan", null, 404);
    }

    const updated = await upsertMessageFeedback(id, body.feedback as "like" | "dislike" | "none");

    reqLog.info({ feedback: updated.feedback, status: 200, duration: Date.now() - start }, "message.feedback_updated");
    return buildSuccessResponse(
      { feedbackId: updated.id, status: updated.feedback },
      "Feedback pesan berhasil diperbarui",
      200,
    );
  } catch (error: unknown) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "message.feedback_failed");
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(msg, error, 500);
  }
}
