import { generateRagAnswer, generateDirectAnswer } from '@/lib/ai/rag';
import { createChatRecord, getChatById, updateChatSummary } from '@/modules/chats/repository';
import { createMessageRecord, getLastMessagesByChatId } from '@/modules/messages/repository';
import { fetchAllAvailableDocuments } from '@/modules/documents/service';
import { routeIntentAndNamespaces } from '@/lib/ai/routing';

const DEFAULT_MODEL_NAME = process.env.LLM_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";

export async function processNewChat(userId: string | null, question: string) {
  // 1. Create a new chat session
  const chat = await createChatRecord({
    title: question.substring(0, 50),
    userId: userId,
  });

  // Ambil memory (karena chat baru, memory kosong)
  const longTermMemory = "";
  const shortTermMemory: any[] = [];

  // Routing Namespaces & Intent
  const documents = await fetchAllAvailableDocuments();
  const routing = await routeIntentAndNamespaces(question, documents);
  console.log(`LLM Routing intent: ${routing.intent}, reason: ${routing.reason}`);

  let ragResponse;
  if (routing.intent === "business") {
    let namespaces = routing.namespaces;
    if (!namespaces || namespaces.length === 0) {
      namespaces = [process.env.PINECONE_NAMESPACE || "pojk-22-2023-perlindungan-konsumen"];
      console.warn("Fallback to default namespace because LLM routing gave empty array.");
    } else {
      console.log(`LLM Routing selected namespaces: ${namespaces.join(', ')}`);
    }
    ragResponse = await generateRagAnswer(question, namespaces, longTermMemory, shortTermMemory);
  } else {
    ragResponse = await generateDirectAnswer(question, longTermMemory, shortTermMemory);
  }

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

export async function processExistingChat(chatId: string, question: string) {
  // 1. Ensure chat exists
  const chat = await getChatById(chatId);
  if (!chat) throw new Error('Chat not found');

  // Ambil memory
  const longTermMemory = chat.summary || "";
  const shortTermMemory = await getLastMessagesByChatId(chatId, 10);

  // Routing Namespaces & Intent
  const documents = await fetchAllAvailableDocuments();
  const routing = await routeIntentAndNamespaces(question, documents);
  console.log(`LLM Routing intent: ${routing.intent}, reason: ${routing.reason}`);

  let ragResponse;
  if (routing.intent === "business") {
    let namespaces = routing.namespaces;
    if (!namespaces || namespaces.length === 0) {
      namespaces = [process.env.PINECONE_NAMESPACE || "pojk-22-2023-perlindungan-konsumen"];
      console.warn("Fallback to default namespace because LLM routing gave empty array.");
    } else {
      console.log(`LLM Routing selected namespaces: ${namespaces.join(', ')}`);
    }
    ragResponse = await generateRagAnswer(question, namespaces, longTermMemory, shortTermMemory);
  } else {
    ragResponse = await generateDirectAnswer(question, longTermMemory, shortTermMemory);
  }

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
