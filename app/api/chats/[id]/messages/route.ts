import { getMessageById } from '@/modules/messages/repository';
import { processExistingChat } from '@/modules/chats/service';
import { NextRequest } from 'next/server';
import { buildSuccessResponse, buildFailedResponse } from '@/lib/utils/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const message = await getMessageById(id);
    
    if (!message) {
      return buildFailedResponse('Pesan tidak ditemukan', null, 404);
    }

    return buildSuccessResponse({ message }, "Pesan berhasil diambil", 200);
  } catch (error: any) {
    return buildFailedResponse(error.message, error, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedParams = await params;
    const { id: chatId } = parsedParams;
    const body = await req.json();

    let question = body.question;
    if (!question && body.messages && body.messages.length > 0) {
      question = body.messages[body.messages.length - 1].content;
    }

    if (!question) {
      return buildFailedResponse('Pertanyaan (question/messages) diperlukan', null, 400);
    }

    console.log(`Melanjutkan chat ${chatId} untuk: ${question}`);
    const result = await processExistingChat(chatId, question);

    return buildSuccessResponse({
      chatId,
      answer: result.ragResponse.answer,
      matches: result.ragResponse.matches
    }, "Pesan berhasil diproses", 200);

  } catch (error: any) {
    console.error("Error pada /api/chats/[id]/messages:", error);
    return buildFailedResponse(error.message, error, 500);
  }
}
