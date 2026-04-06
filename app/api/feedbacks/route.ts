import { buildSuccessResponse, buildFailedResponse } from "@/lib/utils/response";
import { createFeedback } from "./repository";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (typeof body.rating !== "number") {
      return buildFailedResponse("Field rating (numerik) diperlukan", null, 400);
    }

    // Mock resolve userId from session
    // TODO: implement real validation from auth guards 
    const userId = body.userId || null;

    const feedback = await createFeedback({
      rating: body.rating,
      message: body.message,
      category: body.category,
      userId
    });

    return buildSuccessResponse({ feedbackId: feedback.id }, "Feedback umum berhasil dikirim", 201);
  } catch (error: any) {
    console.error("Error pada /api/feedbacks:", error);
    return buildFailedResponse(error.message || "Gagal menyimpan feedback", undefined, 500);
  }
}

export async function GET() {
  return buildSuccessResponse({ status: "active" }, "Endpoint POST /api/feedbacks siap menerima laporan", 200);
}
