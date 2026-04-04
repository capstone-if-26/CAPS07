import { generateRagAnswer } from '@/lib/ai/rag';
import { createChatRecord, getChatById, updateChatSummary } from '@/modules/chats/repository';
import { createMessageRecord, getLastMessagesByChatId } from '@/modules/messages/repository';

const DEFAULT_MODEL_NAME = process.env.LLM_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";

export async function processNewChat(userId: string | null, question: string, namespaceId: string) {
  // 1. Create a new chat session
  const chat = await createChatRecord({
    title: question.substring(0, 50),
    userId: userId,
  });

  // Ambil memory (karena chat baru, memory kosong)
  const longTermMemory = "";
  const shortTermMemory: any[] = [];

  // 2. Generate RAG Answer
  const ragResponse = await generateRagAnswer(question, namespaceId, longTermMemory, shortTermMemory);

  // 3. Save User Message
  await createMessageRecord({
    senderType: 'user',
    content: question,
    chatId: chat.id,
  });

  // 4. Save Assistant Message
  const assistantMsg = await createMessageRecord({
    senderType: 'assistant',
    content: ragResponse.answer,
    chatId: chat.id,
    modelName: DEFAULT_MODEL_NAME,
    metadata: JSON.stringify({ matches: ragResponse.matches }),
  });

  // 5. Update Chat Summary
  await updateChatSummary(chat.id, ragResponse.summary);

  return { chat, ragResponse, messageId: assistantMsg.id };
}

export async function processExistingChat(chatId: string, question: string, namespaceId: string) {
  // 1. Ensure chat exists
  const chat = await getChatById(chatId);
  if (!chat) throw new Error('Chat not found');

  // Ambil memory
  const longTermMemory = chat.summary || "";
  const shortTermMemory = await getLastMessagesByChatId(chatId, 10);

  // 2. Generate RAG Answer
  const ragResponse = await generateRagAnswer(question, namespaceId, longTermMemory, shortTermMemory);

  // 3. Save User Message
  await createMessageRecord({
    senderType: 'user',
    content: question,
    chatId: chat.id,
  });

  // 4. Save Assistant Message
  const assistantMsg = await createMessageRecord({
    senderType: 'assistant',
    content: ragResponse.answer,
    chatId: chat.id,
    modelName: 'RAG Pipeline (OpenRouter)',
    metadata: JSON.stringify({ matches: ragResponse.matches }),
  });

  // 5. Update Chat Summary
  await updateChatSummary(chat.id, ragResponse.summary);

  return { ragResponse, messageId: assistantMsg.id };
}
