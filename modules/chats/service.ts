import {
  createAgenticRagStream,
  generateConversationSummary,
} from "@/lib/ai/rag";
import {
  createChatRecord,
  getChatById,
  updateChatSummary,
} from "@/modules/chats/repository";
import {
  createMessageRecord,
  getLastMessagesByChatId,
  getMessagesByChatId,
} from "@/modules/messages/repository";
import { fetchAllAvailableDocuments } from "@/modules/documents/service";
import {
  classifyIntentAndRelevance,
  generateIntentBasedSummary,
  OjkIntent,
} from "@/lib/ai/intent";

import type { Chats, ClientMessageSnapshot } from "./type";
import {
  persistIntentMetadata,
  toChatLikeMessages,
  formatConversationForSummary,
  formatClientSnapshotForSummary,
  clientSnapshotToChats,
  mapKnowledgeDocuments,
  buildDefaultNamespaces,
} from "./utils";

export { normalizeClientMessageSnapshot } from "./utils";
export type { ClientMessageSnapshot } from "./type";

const DEFAULT_MODEL_NAME =
  process.env.LLM_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";

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
      const finalAnswer =
        answer || "Maaf, saya belum bisa memberikan jawaban saat ini.";

      try {
        const summary = await generateConversationSummary({
          previousSummary: longTermMemory,
          shortTermMemory,
          question,
          answer: finalAnswer,
        });

        await createMessageRecord({
          senderType: "assistant",
          content: finalAnswer,
          chatId,
          modelName: DEFAULT_MODEL_NAME,
          metadata: JSON.stringify({ matches }),
        });

        await updateChatSummary(chatId, summary);
      } catch (error) {
        console.error("Failed to persist assistant response:", error);
      }
    },
  });

  return streamResult;
}

export async function startNewChatStream(
  userId: string | null,
  question: string,
) {
  const chat = await createChatRecord({
    title: question.substring(0, 50),
    userId: userId,
  });

  const longTermMemory = "";
  const shortTermMemory: Chats[] | [] = [];

  await createMessageRecord({
    senderType: "user",
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
  if (!chat) throw new Error("Chat not found");

  const longTermMemory = chat.summary || "";
  const shortTermMemory = await getLastMessagesByChatId(chatId, 10);

  await createMessageRecord({
    senderType: "user",
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
  options?: { clientMessages?: ClientMessageSnapshot[] },
) {
  const chat = await getChatById(chatId);
  if (!chat) throw new Error("Chat not found");

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
    ? [...snapshot]
        .reverse()
        .find((m) => m.role === "user")
        ?.content?.trim() || ""
    : [...dbMessages].reverse().find((msg) => msg.senderType === "user")
        ?.content || "";
  let intent: OjkIntent = "Lainnya";

  const classificationText = conversation || lastUserQuestion;
  if (classificationText) {
    const classification = await classifyIntentAndRelevance(
      classificationText,
      chatLikeMessages,
    );
    intent = classification.intent;
    await persistIntentMetadata(
      chatId,
      chat.metadata,
      lastUserQuestion || classificationText,
      classification,
    );
  }

  const summary = await generateIntentBasedSummary(intent, conversation);
  return {
    chatId,
    intent,
    summary,
  };
}
