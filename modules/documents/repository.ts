import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { randomUUID } from 'crypto';

export type CreateDocumentParam = {
  name: string;
  namespace: string;
  description: string;
};

export async function createDocumentRecord(data: CreateDocumentParam) {
  const newId = randomUUID();
  const [newDoc] = await db.insert(documents).values({
    id: newId,
    name: data.name,
    namespace: data.namespace,
    description: data.description,
  }).returning();
  return newDoc;
}

export async function getAllDocuments() {
  return await db.select().from(documents);
}
