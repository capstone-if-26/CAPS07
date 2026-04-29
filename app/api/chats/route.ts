import { startNewChatStream } from '@/modules/chats/service';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { buildSuccessResponse, buildFailedResponse } from '@/lib/utils/response';
import { toAgenticEventStreamResponse } from '@/lib/ai/rag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support AI SDK standard format (messages array) or direct question
    let question = body.question;
    if (!question && body.messages && body.messages.length > 0) {
      question = body.messages[body.messages.length - 1].content;
    }

    if (!question) {
      return buildFailedResponse('Pertanyaan (question/messages) diperlukan', null, 400);
    }

    // Check auth session
    const session = await auth.api.getSession({
      headers: req.headers
    });
    const userId = session?.user?.id || null;

    console.log(`Memproses chat baru untuk: ${question}`);
    const result = await startNewChatStream(userId, question);

    return toAgenticEventStreamResponse(result.streamResult, {
      'x-chat-id': result.chatId,
    });

  } catch (error: unknown) {
    let message = 'Terjadi kesalahan internal';

    if (error instanceof Error) {
      message = error.message;
    }

    return buildFailedResponse(message, error, 500);
  }
}

export async function GET() {
  return buildSuccessResponse({ status: "active" }, "Endpoint POST /api/chats siap melayani stream agentic RAG", 200);
}