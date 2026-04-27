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

/** Mirrors client/UI messages for summarization (may include turns not persisted yet). */
export type ClientMessageSnapshot = {
  role: 'user' | 'assistant';
  content: string;
};

const SUMMARY_SNAPSHOT_MAX_MESSAGES = 80;
const SUMMARY_SNAPSHOT_MAX_CONTENT = 32000;

export function normalizeClientMessageSnapshot(body: unknown): ClientMessageSnapshot[] | undefined {
  if (!Array.isArray(body)) return undefined;
  const out: ClientMessageSnapshot[] = [];
  for (const item of body.slice(-SUMMARY_SNAPSHOT_MAX_MESSAGES)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as { role?: unknown; content?: unknown };
    if (o.role !== 'user' && o.role !== 'assistant') continue;
    if (typeof o.content !== 'string') continue;
    const trimmed = o.content.slice(0, SUMMARY_SNAPSHOT_MAX_CONTENT).trim();
    if (!trimmed) continue;
    out.push({ role: o.role, content: trimmed });
  }
  return out.length > 0 ? out : undefined;
}

function formatClientSnapshotForSummary(msgs: ClientMessageSnapshot[]): string {
  const lastMessages = msgs.slice(-40);
  return lastMessages
    .map((message) => {
      const role = message.role === 'assistant' ? 'Asisten' : 'User';
      return `${role}: ${message.content}`;
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

function clientSnapshotToChats(msgs: ClientMessageSnapshot[]): Chats[] {
  const now = new Date();
  return msgs.map((m, i) => ({
    id: `client-${i}`,
    senderType: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
    status: null,
    tokenCount: null,
    modelName: null,
    parentMessage: null,
    turnIndex: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    chatId: '',
  }));
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
}: {
  chatId: string;
  question: string;
  longTermMemory: string;
  shortTermMemory: Chats[] | [];
}) {
  const documents = await fetchAllAvailableDocuments();
  const availableDocuments = mapKnowledgeDocuments(documents);
  const defaultNamespaces = buildDefaultNamespaces(availableDocuments);

  const streamResult = createAgenticRagStream({
    question,
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

  await createMessageRecord({
    senderType: 'user',
    content: question,
    chatId: chat.id,
  });

  const streamResult = await buildAgenticStreamSession({
    chatId: chat.id,
    question,
    longTermMemory,
    shortTermMemory,
  });

  return { chatId: chat.id, streamResult };
}

export async function continueChatStream(chatId: string, question: string) {
  const chat = await getChatById(chatId);
  if (!chat) throw new Error('Chat not found');

  const longTermMemory = chat.summary || "";
  const shortTermMemory = await getLastMessagesByChatId(chatId, 10);

  await createMessageRecord({
    senderType: 'user',
    content: question,
    chatId: chat.id,
  });

  const streamResult = await buildAgenticStreamSession({
    chatId: chat.id,
    question,
    longTermMemory,
    shortTermMemory,
  });

  return { chatId: chat.id, streamResult };
}

export async function generateChatIntentSummary(
  chatId: string,
  options?: { clientMessages?: ClientMessageSnapshot[] }
) {
  const chat = await getChatById(chatId);
  if (!chat) throw new Error('Chat not found');

  const dbMessages = await getMessagesByChatId(chatId);
  const snapshot =
    options?.clientMessages && options.clientMessages.length > 0
      ? options.clientMessages
      : undefined;

  const conversation = snapshot
    ? formatClientSnapshotForSummary(snapshot)
    : formatConversationForSummary(dbMessages);

  const intentContextChats = snapshot
    ? clientSnapshotToChats(snapshot)
    : toChatLikeMessages(dbMessages);

  const chatLikeMessages = intentContextChats.slice(-20);
  const lastUserQuestion = snapshot
    ? [...snapshot].reverse().find((m) => m.role === 'user')?.content?.trim() || ''
    : [...dbMessages].reverse().find((msg) => msg.senderType === 'user')?.content || '';
  let intent: OjkIntent = 'Lainnya';

  const classificationText = conversation || lastUserQuestion;
  if (classificationText) {
    const classification = await classifyIntentAndRelevance(classificationText, chatLikeMessages);
    intent = classification.intent;
    await persistIntentMetadata(chatId, chat.metadata, lastUserQuestion || classificationText, classification);
  }

  const summary = await generateIntentBasedSummary(intent, conversation);
  return {
    chatId,
    intent,
    summary,
  };
}
