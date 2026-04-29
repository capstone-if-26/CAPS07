import { AgenticKnowledgeDocument } from "@/lib/ai/rag";
import { OjkIntent } from "@/lib/ai/intent";
import {
  updateChatMetadata,
} from "@/modules/chats/repository";
import { getMessagesByChatId } from "@/modules/messages/repository";
import { fetchAllAvailableDocuments } from "@/modules/documents/service";
import type { Chats, ChatMetadataShape, ClientMessageSnapshot } from "./type";

const DEFAULT_NAMESPACE =
  process.env.PINECONE_NAMESPACE || "pojk-22-2023-perlindungan-konsumen";

const SUMMARY_SNAPSHOT_MAX_MESSAGES = 80;
const SUMMARY_SNAPSHOT_MAX_CONTENT = 32000;

// ─── Metadata helpers ───────────────────────────────────────────────

export function parseChatMetadata(metadataRaw: string | null): ChatMetadataShape {
  if (!metadataRaw) return {};

  try {
    const parsed = JSON.parse(metadataRaw) as ChatMetadataShape;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function persistIntentMetadata(
  chatId: string,
  currentMetadataRaw: string | null,
  question: string,
  classification: {
    intent: OjkIntent;
    isOjkRelevant: boolean;
    confidence: number;
    reason: string;
  },
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

// ─── Message conversion helpers ─────────────────────────────────────

export function toChatLikeMessages(
  records: Awaited<ReturnType<typeof getMessagesByChatId>>,
): Chats[] {
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

// ─── Formatting helpers ─────────────────────────────────────────────

export function formatConversationForSummary(
  messages: Awaited<ReturnType<typeof getMessagesByChatId>>,
): string {
  const lastMessages = messages.slice(-40);

  return lastMessages
    .map((message) => {
      const role =
        message.senderType === "assistant"
          ? "Asisten"
          : message.senderType === "user"
            ? "User"
            : "System";
      return `${role}: ${String(message.content || "").trim()}`;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}

export function formatClientSnapshotForSummary(msgs: ClientMessageSnapshot[]): string {
  const lastMessages = msgs.slice(-40);
  return lastMessages
    .map((message) => {
      const role = message.role === "assistant" ? "Asisten" : "User";
      return `${role}: ${message.content}`;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}

// ─── Client snapshot helpers ────────────────────────────────────────

export function normalizeClientMessageSnapshot(
  body: unknown,
): ClientMessageSnapshot[] | undefined {
  if (!Array.isArray(body)) return undefined;
  const out: ClientMessageSnapshot[] = [];
  for (const item of body.slice(-SUMMARY_SNAPSHOT_MAX_MESSAGES)) {
    if (!item || typeof item !== "object") continue;
    const o = item as { role?: unknown; content?: unknown };
    if (o.role !== "user" && o.role !== "assistant") continue;
    if (typeof o.content !== "string") continue;
    const trimmed = o.content.slice(0, SUMMARY_SNAPSHOT_MAX_CONTENT).trim();
    if (!trimmed) continue;
    out.push({ role: o.role, content: trimmed });
  }
  return out.length > 0 ? out : undefined;
}

export function clientSnapshotToChats(msgs: ClientMessageSnapshot[]): Chats[] {
  const now = new Date();
  return msgs.map((m, i) => ({
    id: `client-${i}`,
    senderType: m.role === "user" ? "user" : "assistant",
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
    chatId: "",
  }));
}

// ─── Document mapping helpers ───────────────────────────────────────

export function mapKnowledgeDocuments(
  documents: Awaited<ReturnType<typeof fetchAllAvailableDocuments>>,
): AgenticKnowledgeDocument[] {
  return documents
    .map((doc) => ({
      name: String(doc.name || "").trim() || "Dokumen Internal",
      namespace: String(doc.namespace || "").trim(),
      description:
        String(doc.description || "").trim() ||
        "Dokumen referensi internal OJK.",
    }))
    .filter((doc) => Boolean(doc.namespace));
}

export function buildDefaultNamespaces(
  documents: AgenticKnowledgeDocument[],
): string[] {
  const fromDocs = Array.from(new Set(documents.map((doc) => doc.namespace)));
  return fromDocs.length > 0 ? fromDocs : [DEFAULT_NAMESPACE];
}
