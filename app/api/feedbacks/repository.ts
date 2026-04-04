import { db } from "@/lib/db";
import { feedbacks } from "@/lib/db/schema";
import { randomUUID } from "crypto";

export type CreateFeedbackParam = {
  rating: number;
  message?: string;
  category?: string;
  userId?: string;
};

export async function createFeedback(data: CreateFeedbackParam) {
  const newId = randomUUID();
  const [newFeedback] = await db.insert(feedbacks).values({
    id: newId,
    rating: data.rating,
    message: data.message,
    category: data.category || "general",
    userId: data.userId || null, 
  }).returning();
  
  return newFeedback;
}
