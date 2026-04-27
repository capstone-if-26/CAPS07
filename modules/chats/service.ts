import {
  AgenticKnowledgeDocument,
  createAgenticRagStream,
  generateConversationSummary,
} from '@/lib/ai/rag';
import { createChatRecord, getChatById, updateChatMetadata, updateChatSummary } from '@/modules/chats/repository';
import { createMessageRecord, getLastMessagesByChatId, getMessagesByChatId } from '@/modules/messages/repository';
import { fetchAllAvailableDocuments } from '@/modules/documents/service';
import { Chats } from './type';
import {
  classifyIntentAndRelevance,
  generateIntentBasedSummary,
  getOffTopicTemplate,
  OjkIntent,
} from '@/lib/ai/intent';

const DEFAULT_MODEL_NAME = process.env.LLM_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";
const DEFAULT_NAMESPACE = process.env.PINECONE_NAMESPACE || 'pojk-22-2023-perlindungan-konsumen';

type ChatMetadataShape = {
  intent?: OjkIntent;
  isOjkRelevant?: boolean;
  intentConfidence?: number;
  intentReason?: string;
  intentUpdatedAt?: string;
  intentHistory?: Array<{
    intent: OjkIntent;
    isOjkRelevant: boolean;
    confidence: number;
    at: string;
    questionPreview: string;
  }>;
};

function parseChatMetadata(metadataRaw: string | null): ChatMetadataShape {
  if (!metadataRaw) return {};

  try {
    const parsed = JSON.parse(metadataRaw) as ChatMetadataShape;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function persistIntentMetadata(
  chatId: string,
  currentMetadataRaw: string | null,
  question: string,
  classification: { intent: OjkIntent; isOjkRelevant: boolean; confidence: number; reason: string }
) {
  const currentMetadata = parseChatMetadata(currentMetadataRaw);
  const nowIso = new Date().toISOString();
  const nextHistory = [
    ...(currentMetadata.intentHistory || []),
    {
      intent: classification.intent,
      isOjkRelevant: classification.isOjkRelevant,
      confidence: classification.confidence,
      at: nowIso,
      questionPreview: question.slice(0, 140),
    },
  ].slice(-25);

  const nextMetadata: ChatMetadataShape = {
    ...currentMetadata,
    intent: classification.intent,
    isOjkRelevant: classification.isOjkRelevant,
    intentConfidence: classification.confidence,
    intentReason: classification.reason,
    intentUpdatedAt: nowIso,
    intentHistory: nextHistory,
  };

  await updateChatMetadata(chatId, JSON.stringify(nextMetadata));
}

function toChatLikeMessages(records: Awaited<ReturnType<typeof getMessagesByChatId>>): Chats[] {
  return records.map((record) => ({
    id: String(record.id),
    senderType: record.senderType,
    content: record.content,
    status: record.status,
    tokenCount: record.tokenCount,
    modelName: record.modelName,
    parentMessage: record.parentMessage,
    turnIndex: record.turnIndex,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    chatId: String(record.chatId),
  }));
}

function formatConversationForSummary(messages: Awaited<ReturnType<typeof getMessagesByChatId>>): string {
  const lastMessages = messages.slice(-40);

  return lastMessages
    .map((message) => {
      const role = message.senderType === 'assistant' ? 'Asisten' : message.senderType === 'user' ? 'User' : 'System';
      return `${role}: ${String(message.content || '').trim()}`;
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

function mapKnowledgeDocuments(
  documents: Awaited<ReturnType<typeof fetchAllAvailableDocuments>>
): AgenticKnowledgeDocument[] {
  return documents
    .map((doc) => ({
      name: String(doc.name || '').trim() || 'Dokumen Internal',
      namespace: String(doc.namespace || '').trim(),
      description: String(doc.description || '').trim() || 'Dokumen referensi internal OJK.',
    }))
    .filter((doc) => Boolean(doc.namespace));
}

function buildDefaultNamespaces(documents: AgenticKnowledgeDocument[]): string[] {
  const fromDocs = Array.from(new Set(documents.map((doc) => doc.namespace)));
  return fromDocs.length > 0 ? fromDocs : [DEFAULT_NAMESPACE];
}

async function buildAgenticStreamSession({
  chatId,
  question,
  longTermMemory,
  shortTermMemory,
  intent,
}: {
  chatId: string;
  question: string;
  longTermMemory: string;
  shortTermMemory: Chats[] | [];
  intent: OjkIntent;
}) {
  const documents = await fetchAllAvailableDocuments();
  const availableDocuments = mapKnowledgeDocuments(documents);
  const defaultNamespaces = buildDefaultNamespaces(availableDocuments);

  const streamResult = createAgenticRagStream({
    question,
    intent,
    longTermMemory,
    shortTermMemory,
    availableDocuments,
    defaultNamespaces,
    onFinish: async ({ answer, matches }) => {
      const finalAnswer = answer || 'Maaf, saya belum bisa memberikan jawaban saat ini.';

      try {
        const summary = await generateConversationSummary({
          previousSummary: longTermMemory,
          shortTermMemory,
          question,
          answer: finalAnswer,
        });

        await createMessageRecord({
          senderType: 'assistant',
          content: finalAnswer,
          chatId,
          modelName: DEFAULT_MODEL_NAME,
          metadata: JSON.stringify({ matches }),
        });

        await updateChatSummary(chatId, summary);
      } catch (error) {
        console.error('Failed to persist assistant response:', error);
      }
    },
  });

  return streamResult;
}

export async function startNewChatStream(userId: string | null, question: string) {
  const chat = await createChatRecord({
    title: question.substring(0, 50),
    userId: userId,
  });

  const longTermMemory = "";
  const shortTermMemory: Chats[] | [] = [];
  const intentClassification = await classifyIntentAndRelevance(question, shortTermMemory);

  console.log('[IntentClassification][new-chat]', {
    question,
    intent: intentClassification.intent,
    isOjkRelevant: intentClassification.isOjkRelevant,
    confidence: intentClassification.confidence,
    reason: intentClassification.reason,
  });

  await createMessageRecord({
    senderType: 'user',
    content: question,
    chatId: chat.id,
  });

  await persistIntentMetadata(chat.id, chat.metadata, question, intentClassification);

  if (!intentClassification.isOjkRelevant) {
    const blockedReply = getOffTopicTemplate();

    await createMessageRecord({
      senderType: 'assistant',
      content: blockedReply,
      chatId: chat.id,
      modelName: DEFAULT_MODEL_NAME,
      metadata: JSON.stringify({ intent: intentClassification.intent, blocked: true }),
    });

    const summary = await generateConversationSummary({
      previousSummary: longTermMemory,
      shortTermMemory,
      question,
      answer: blockedReply,
    });
    await updateChatSummary(chat.id, summary);

    return { chatId: chat.id, blockedMessage: blockedReply };
  }

  const streamResult = await buildAgenticStreamSession({
    chatId: chat.id,
    question,
    longTermMemory,
    shortTermMemory,
    intent: intentClassification.intent,
  });

  return { chatId: chat.id, streamResult };
}

export async function continueChatStream(chatId: string, question: string) {
  const chat = await getChatById(chatId);
  if (!chat) throw new Error('Chat not found');

  const longTermMemory = chat.summary || "";
  const shortTermMemory = await getLastMessagesByChatId(chatId, 10);
  const intentClassification = await classifyIntentAndRelevance(question, shortTermMemory as Chats[]);

  console.log('[IntentClassification][existing-chat]', {
    chatId,
    question,
    intent: intentClassification.intent,
    isOjkRelevant: intentClassification.isOjkRelevant,
    confidence: intentClassification.confidence,
    reason: intentClassification.reason,
  });

  await createMessageRecord({
    senderType: 'user',
    content: question,
    chatId: chat.id,
  });

  await persistIntentMetadata(chat.id, chat.metadata, question, intentClassification);

  if (!intentClassification.isOjkRelevant) {
    const blockedReply = getOffTopicTemplate();

    await createMessageRecord({
      senderType: 'assistant',
      content: blockedReply,
      chatId: chat.id,
      modelName: DEFAULT_MODEL_NAME,
      metadata: JSON.stringify({ intent: intentClassification.intent, blocked: true }),
    });

    const summary = await generateConversationSummary({
      previousSummary: longTermMemory,
      shortTermMemory: shortTermMemory as Chats[],
      question,
      answer: blockedReply,
    });
    await updateChatSummary(chat.id, summary);

    return { chatId: chat.id, blockedMessage: blockedReply };
  }

  const streamResult = await buildAgenticStreamSession({
    chatId: chat.id,
    question,
    longTermMemory,
    shortTermMemory,
    intent: intentClassification.intent,
  });

  return { chatId: chat.id, streamResult };
}

export async function generateChatIntentSummary(chatId: string) {
  const chat = await getChatById(chatId);
  if (!chat) throw new Error('Chat not found');

  const messages = await getMessagesByChatId(chatId);
  const conversation = formatConversationForSummary(messages);

  const metadata = parseChatMetadata(chat.metadata);
  let intent = metadata.intent || 'Lainnya';

  if (!intent || intent === 'Lainnya') {
    const chatLikeMessages = toChatLikeMessages(messages).slice(-10);
    const lastUserQuestion = [...messages].reverse().find((msg) => msg.senderType === 'user')?.content || '';
    if (lastUserQuestion) {
      const classification = await classifyIntentAndRelevance(lastUserQuestion, chatLikeMessages);
      intent = classification.intent;
      await persistIntentMetadata(chatId, chat.metadata, lastUserQuestion, classification);
    }
  }

  const summary = await generateIntentBasedSummary(intent, conversation);
  return {
    chatId,
    intent,
    summary,
  };
}
