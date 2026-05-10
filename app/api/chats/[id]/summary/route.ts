import { NextRequest } from 'next/server';
import { buildFailedResponse, buildSuccessResponse } from '@/lib/utils/response';
import {
  generateChatIntentSummary,
  normalizeClientMessageSnapshot,
} from '@/modules/chats/service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await params;

    if (!chatId) {
      return buildFailedResponse('Chat ID diperlukan', null, 400);
    }

    let clientMessages = undefined;
    try {
      const body: unknown = await req.json();
      if (body && typeof body === 'object' && body !== null && 'messages' in body) {
        clientMessages = normalizeClientMessageSnapshot(
          (body as { messages: unknown }).messages
        );
      }
    } catch {
      /* empty or non-JSON body */
    }

    const result = await generateChatIntentSummary(chatId, { clientMessages });

    return buildSuccessResponse(result, 'Ringkasan intent berhasil dibuat', 200);
  } catch (error: unknown) {
    let message = 'Terjadi kesalahan internal';

    if (error instanceof Error) {
      message = error.message;
    }

    return buildFailedResponse(message, error, 500);
  }
}
