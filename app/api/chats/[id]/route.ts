import { processExistingChat } from '@/modules/chats/service';
import { getMessagesByChatId } from '@/modules/messages/repository';
import { NextRequest } from 'next/server';
import { buildSuccessResponse, buildFailedResponse } from '@/lib/utils/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedParams = await params;
    const { id } = parsedParams;
    const messages = await getMessagesByChatId(id);
    return buildSuccessResponse({ chatId: id, messages }, "Histori chat berhasil diambil", 200);
  } catch (error: any) {
    return buildFailedResponse(error.message, error, 500);
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

    const namespaceId = process.env.PINECONE_NAMESPACE || "default-namespace";
    
    console.log(`Melanjutkan chat [${id}] dengan kueri: ${question}`);
    const result = await processExistingChat(id, question, namespaceId);
    
    return buildSuccessResponse({ 
      chatId: id,
      answer: result.ragResponse.answer,
      matches: result.ragResponse.matches
    }, "Pesan berhasil dibalas", 200);
    
  } catch (error: any) {
    console.error(`Error pada /api/chats/[id]:`, error);
    return buildFailedResponse(error.message, error, 500);
  }
}