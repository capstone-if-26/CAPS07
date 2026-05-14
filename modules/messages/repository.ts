import { eq, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages, messageFeedbacks } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { CreateMessageParam } from './type';
import { DEFAULT_SHORT_TERM_MEMORY_MESSAGE_LIMIT } from './constants';

export async function createMessageRecord(data: CreateMessageParam) {
  const newId = randomUUID();
  const [newMsg] = await db.insert(messages).values({
    id: newId,
    ...data,
  }).returning();
  return newMsg;
}

export async function getMessagesByChatId(chatId: string) {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
}

export async function getLastMessagesByChatId(chatId: string, messageLimit: number = DEFAULT_SHORT_TERM_MEMORY_MESSAGE_LIMIT) {
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

export async function upsertMessageFeedback(messageId: string, feedback: "like" | "dislike" | "none") {
  const existing = await db
    .select()
    .from(messageFeedbacks)
    .where(eq(messageFeedbacks.messageId, messageId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(messageFeedbacks)
      .set({ feedback })
      .where(eq(messageFeedbacks.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const newId = randomUUID();
    const [inserted] = await db
      .insert(messageFeedbacks)
      .values({
        id: newId,
        messageId,
        feedback,
      })
      .returning();
    return inserted;
  }
}
