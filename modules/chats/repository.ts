import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { randomUUID } from 'crypto';

export type CreateChatParam = {
  title?: string;
  userId: string | null;
  status?: string;
};

export async function createChatRecord(data: CreateChatParam) {
  const newId = randomUUID();
  const [newChat] = await db.insert(chats).values({
    id: newId,
    title: data.title || 'New Chat',
    status: data.status || 'ACTIVE',
    userId: data.userId,
  }).returning();
  return newChat;
}

export async function getChatById(id: string) {
  const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserChats(userId: string) {
  return await db.select().from(chats).where(eq(chats.userId, userId));
}

export async function updateChatSummary(chatId: string, summary: string) {
  const [updatedChat] = await db.update(chats)
    .set({ summary, summaryUpdated: new Date() })
    .where(eq(chats.id, chatId))
    .returning();
  return updatedChat;
}
