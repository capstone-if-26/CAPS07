import { continueChatStream } from '@/modules/chats/service';
import { getMessagesByChatId } from '@/modules/messages/repository';
import { NextRequest } from 'next/server';
import { buildSuccessResponse, buildFailedResponse } from '@/lib/utils/response';
import { toAgenticEventStreamResponse } from '@/lib/ai/rag';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedParams = await params;
    const { id } = parsedParams;
    const messages = await getMessagesByChatId(id);
    return buildSuccessResponse({ chatId: id, messages }, "Histori chat berhasil diambil", 200);
  } catch (error: unknown) {
    let message = 'Terjadi kesalahan internal';

    if (error instanceof Error) {
      message = error.message;
    }

    return buildFailedResponse(message, error, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedParams = await params;
    const { id } = parsedParams;
    const body = await req.json();
    
    let question = body.question;
    if (!question && body.messages && body.messages.length > 0) {
      question = body.messages[body.messages.length - 1].content;
    }

    if (!question) {
      return buildFailedResponse('Pertanyaan diperlukan', null, 400);
    }

    console.log(`Melanjutkan chat [${id}] dengan kueri: ${question}`);
    const result = await continueChatStream(id, question);

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