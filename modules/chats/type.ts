import { OjkIntent } from "@/lib/ai/intent";

export type Chats = {
    id: string;
    senderType: string | null;
    content: string | null;
    status: string | null;
    tokenCount: number | null;
    modelName: string | null;
    parentMessage: string | null;
    turnIndex: string | null;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    chatId: string;
}

export type ChatMetadataShape = {
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

/** Mirrors client/UI messages for summarization (may include turns not persisted yet). */
export type ClientMessageSnapshot = {
  role: "user" | "assistant";
  content: string;
};