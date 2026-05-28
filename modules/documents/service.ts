import { getAllDocuments, getDocument } from "./repository";
import { deletePineconeNamespace } from "@/lib/pinecone/utils";
import {
  deleteDocumentRecord,
  createDocumentRecord,
  updateDocumentProcessingStatus,
  updateDocumentTotalChunks,
  updateDocumentStatus as updateDocumentStatusRepository,
} from "./repository";
import { upsertChunksPipeline } from "@/lib/pinecone/utils";
import {
  validateFileExtension,
  executeChunkerPipeline,
} from "@/lib/chunking/chunkerStrategy";
import { ChunkerConfig } from "@/types/chunker";
import * as crypto from "crypto";
import { UploadDocumentInput, UploadDocumentResult } from "./types";
import { DocumentUploadError, DocumentOperationError } from "./error";
import { getModuleLogger } from "@/lib/logger";

const log = getModuleLogger("modules/documents/service");

export async function fetchAllAvailableDocuments(
  search: string = "",
  page: number = 1,
  limit: number = 10,
) {
  try {
    const offset = (page - 1) * limit;
    const result = await getAllDocuments({ search, limit, offset });

    return {
      documents: result.data,
      metadata: {
        total: result.totalCount,
        page,
        limit,
        totalPages: Math.ceil(result.totalCount / limit),
      },
    };
  } catch (error) {
    log.error({ err: error }, "document.list_fetch_failed");
    throw error;
  }
}

export async function getDocumentById(id: string) {
  try {
    const document = await getDocument(id);
    return document;
  } catch (error) {
    log.error({ err: error, documentId: id }, "document.fetch_by_id_failed");
    throw error;
  }
}

export async function deleteDocument(id: string) {
  const doc = await getDocument(id);
  if (!doc) {
    throw new DocumentOperationError(
      `Dokumen dengan ID '${id}' tidak ditemukan`,
      "DOCUMENT_NOT_FOUND",
    );
  }

  try {
    await deleteDocumentRecord(id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    throw new DocumentOperationError(
      `Gagal menghapus dokumen dari database: ${message}`,
      "DB_DELETE_FAILED",
    );
  }

  try {
    await deletePineconeNamespace(doc.namespace);
  } catch (error) {
    log.error({ err: error, documentId: id }, "document.pinecone_delete_failed");
    log.warn({ documentId: id }, "document.rollback_attempted");
    try {
      await createDocumentRecord({
        name: doc.name,
        namespace: doc.namespace,
        description: doc.description,
        documentType: doc.documentType,
        fileName: doc.fileName,
        statusDocument: doc.statusDocument,
        version: doc.version,
        effectiveDate: doc.effectiveDate,
      });
      log.info({ documentId: id }, "document.rollback_succeeded");
    } catch (rollbackError) {
      log.error({ err: rollbackError, documentId: id }, "document.rollback_failed");
    }

    const message =
      error instanceof Error ? error.message : "Unknown Pinecone error";
    throw new DocumentOperationError(
      `Gagal menghapus data dari Pinecone: ${message}`,
      "PINECONE_DELETE_FAILED",
    );
  }

  return { documentId: id, status: "deleted" as const };
}

/**
 * Phase 1 (Synchronous): Validates input and inserts a DB record with status "processing".
 * Returns immediately so the client does not timeout.
 */
export async function initiateDocumentUpload(
  input: UploadDocumentInput,
): Promise<UploadDocumentResult> {
  const {
    file,
    fileName,
    documentName,
    documentType,
    description,
    namespaceName,
    documentVersion,
    effectiveDate,
    statusDocument,
  } = input;

  const validation = validateFileExtension(documentType, fileName);
  if (!validation.valid) {
    throw new DocumentUploadError(
      `Format file '${validation.fileExtension}' tidak didukung untuk documentType '${documentType}'. ` +
        `Format yang diizinkan: ${validation.allowedExtensions.join(", ")}`,
      "INVALID_FILE_FORMAT",
    );
  }

  const fileHash = crypto.createHash("sha256").update(file).digest("hex");
  const parsedEffectiveDate = effectiveDate ? new Date(effectiveDate) : null;

  let documentRecord;
  try {
    documentRecord = await createDocumentRecord({
      name: documentName,
      namespace: namespaceName,
      description: description || "",
      documentType,
      fileName,
      statusDocument: statusDocument || "Berlaku",
      version: documentVersion || "v1.0",
      effectiveDate: parsedEffectiveDate,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    throw new DocumentUploadError(
      `Gagal menyimpan dokumen ke database: ${message}`,
      "DB_INSERT_FAILED",
    );
  }

  return {
    documentId: documentRecord.id,
    documentType,
    processingStatus: "processing",
    fileName,
    namespace: namespaceName,
    fileHash,
    statusDocument: documentRecord.statusDocument,
    version: documentRecord.version,
    effectiveDate: documentRecord.effectiveDate,
    createdAt: documentRecord.createdAt,
  };
}

/**
 * Phase 2 (Asynchronous): Chunking + Pinecone upsert.
 * Called via `after()` after the response is sent to the client.
 */
export async function processDocumentInBackground(
  documentId: string,
  input: UploadDocumentInput,
): Promise<void> {
  const {
    file,
    fileName,
    documentName,
    documentType,
    namespaceName,
    documentVersion,
    language,
    securityLevel,
    effectiveDate,
    processingStatus,
  } = input;

  log.info({ documentId, documentType, fileName }, "document.background_processing_started");

  try {
    const chunkerConfig: ChunkerConfig = {
      sourceInput: file,
      fileName,
      documentName,
      documentVersion,
      docType: documentType,
      language,
      securityLevel,
      effectiveDate: effectiveDate || null,
      processingStatus,
    };

    const chunks = await executeChunkerPipeline(documentType, file, chunkerConfig);

    if (chunks.length === 0) {
      log.warn({ documentId }, "document.background_empty_chunks");
      await updateDocumentProcessingStatus(
        documentId,
        "failed",
        "Dokumen tidak menghasilkan chunk. Pastikan dokumen memiliki konten yang valid.",
      );
      return;
    }

    await upsertChunksPipeline(chunks, namespaceName);
    await updateDocumentTotalChunks(documentId, chunks.length);
    await updateDocumentProcessingStatus(documentId, "completed");

    log.info({ documentId, chunkCount: chunks.length }, "document.background_completed");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";

    log.error({ err: error, documentId }, "document.background_failed");

    try {
      await updateDocumentProcessingStatus(documentId, "failed", errorMessage);
    } catch (updateError) {
      log.error({ err: updateError, documentId }, "document.background_status_update_failed");
    }

    try {
      await deleteDocumentRecord(documentId);
      log.info({ documentId }, "document.background_rollback_succeeded");
    } catch (rollbackError) {
      log.error({ err: rollbackError, documentId }, "document.background_rollback_failed");
    }
  }
}

export async function updateDocumentStatus(id: string, documentStatus: string) {
  try {
    const document = await getDocument(id);
    if (!document) {
      throw new DocumentOperationError(
        `Dokumen dengan ID '${id}' tidak ditemukan`,
        "DOCUMENT_NOT_FOUND",
      );
    }

    await updateDocumentStatusRepository(id, documentStatus);
  } catch (error) {
    log.error({ err: error, documentId: id }, "document.status_update_failed");
    throw error;
  }
}
