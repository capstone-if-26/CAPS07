import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, messageFeedbacks } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { CreateMessageParam } from './type';

export async function createMessageRecord(data: CreateMessageParam) {
  const newId = randomUUID();
  const [newMsg] = await db.insert(messages).values({
    id: newId,
    ...data,
  }).returning();
  return newMsg;
}

export async function getMessagesByChatId(chatId: string) {
  return await db.select().from(messages).where(eq(messages.chatId, chatId));
}

export async function getLastMessagesByChatId(chatId: string, messageLimit: number = 10) {
  const result = await db.select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.createdAt))
    .limit(messageLimit);
  return result.reverse();
}

export async function getMessageById(messageId: string) {
  const result = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  return result[0] || null;
}

export type CreateFeedbackParam = {
  rating: number;
  reason?: string;
  metadata?: string;
};

export async function createFeedbackRecord(messageId: string, data: CreateFeedbackParam) {
  const newId = randomUUID();
  const [newFeedback] = await db.insert(messageFeedbacks).values({
    id: newId,
    messageId: messageId,
    rating: data.rating,
    reason: data.reason,
    metadata: data.metadata,
  }).returning();
  return newFeedback;
}
