import { NextRequest } from 'next/server';
import { buildFailedResponse, buildSuccessResponse } from '@/lib/utils/response';
import { generateChatIntentSummary } from '@/modules/chats/service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await params;

    if (!chatId) {
      return buildFailedResponse('Chat ID diperlukan', null, 400);
    }

    const result = await generateChatIntentSummary(chatId);

    return buildSuccessResponse(result, 'Ringkasan intent berhasil dibuat', 200);
  } catch (error: unknown) {
    let message = 'Terjadi kesalahan internal';

    if (error instanceof Error) {
      message = error.message;
    }

    return buildFailedResponse(message, error, 500);
  }
}
