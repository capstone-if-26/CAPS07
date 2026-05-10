import { NextRequest } from "next/server";
import {
  buildSuccessResponse,
  buildFailedResponse,
} from "@/lib/utils/response";
import { startQuiz } from "@/modules/chats/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const quiz = await startQuiz(id);
    return buildSuccessResponse(quiz, "Quiz berhasil dibuat", 200);
  } catch (error) {
    let message = "Terjadi kesalahan internal";

    if (error instanceof Error) {
      message = error.message;
    }

    return buildFailedResponse(message, error, 500);
  }
}
