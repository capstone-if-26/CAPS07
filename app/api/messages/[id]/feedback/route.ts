import { NextRequest } from "next/server";
import { buildFailedResponse, buildSuccessResponse } from "@/lib/utils/response";
import { upsertMessageFeedback, getMessageById } from "@/modules/messages/repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    if (!['like', 'dislike', 'none'].includes(body.feedback)) {
      return buildFailedResponse("Field feedback harus bernilai 'like', 'dislike', atau 'none'", null, 400);
    }

    // Pastikan message ada
    const message = await getMessageById(id);
    if (!message) {
      return buildFailedResponse("Pesan tidak ditemukan", null, 404);
    }

    const updated = await upsertMessageFeedback(id, body.feedback as "like" | "dislike" | "none");

    return buildSuccessResponse(
      { feedbackId: updated.id, status: updated.feedback }, 
      "Feedback pesan berhasil diperbarui", 
      200
    );

  } catch (error: unknown) {
    let msg = 'Terjadi kesalahan internal';
    if (error instanceof Error) {
      msg = error.message;
    }
    return buildFailedResponse(msg, error, 500);
  }
}
