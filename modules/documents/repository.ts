import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { documents } from "@/lib/db/schema";
import { CreateDocumentParam } from "./types";

export async function createDocumentRecord(data: CreateDocumentParam) {
  const [newDoc] = await db
    .insert(documents)
    .values({
      name: data.name,
      namespace: data.namespace,
      description: data.description,
      documentType: data.documentType,
      fileName: data.fileName,
      statusDocument: data.statusDocument ?? "Berlaku",
      version: data.version ?? "v1.0",
      effectiveDate: data.effectiveDate ?? null,
    })
    .returning();
  return newDoc;
}

export async function updateDocumentProcessingStatus(
  id: string,
  status: string,
  errorMessage?: string | null,
) {
  const [updated] = await db
    .update(documents)
    .set({
      processingStatus: status,
      errorMessage: errorMessage ?? null,
    })
    .where(eq(documents.id, id))
    .returning();
  return updated;
}

export async function updateDocumentTotalChunks(
  id: string,
  totalChunks: number,
) {
  const [updated] = await db
    .update(documents)
    .set({ totalChunks })
    .where(eq(documents.id, id))
    .returning();
  return updated;
}

export async function updateDocumentStatus(
  id: string,
  status: string,
) {
  const [updated] = await db
    .update(documents)
    .set({ statusDocument: status })
    .where(eq(documents.id, id))
    .returning();
  return updated;
}

export async function getAllDocuments() {
  return await db.select().from(documents);
}

export function getValidDocuments() {
  return db.select({
    id: documents.id,
    name: documents.name,
    namespace: documents.namespace,
    description: documents.description,
    createdAt: documents.createdAt
  })
  .from(documents)
  .where(eq(documents.statusDocument, "Berlaku"));
}

export async function getDocument(id: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  return doc;
}

export async function deleteDocumentRecord(id: string) {
  await db.delete(documents).where(eq(documents.id, id));
}

