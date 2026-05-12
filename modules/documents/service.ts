import { getAllDocuments, getDocument } from "./repository";
import { deletePineconeNamespace } from "@/lib/pinecone/utils";
import {
  deleteDocumentRecord,
  createDocumentRecord,
  updateDocumentProcessingStatus,
  updateDocumentTotalChunks,
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

export async function fetchAllAvailableDocuments(
  search: string = "",
  page: number = 1,
  limit: number = 10
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
        totalPages: Math.ceil(result.totalCount / limit)
      }
    };
  } catch (error) {
    console.error("Gagal mengambil semua dokumen:", error);
    throw error;
  }
}

export async function getDocumentById(id: string) {
  try {
    const document = await getDocument(id);
    return document;
  } catch (error) {
    console.error(`Gagal mengambil dokumen dengan ID '${id}':`, error);
    throw error;
  }
}

export async function deleteDocument(id: string) {
  // 1. Ambil dokumen untuk mendapatkan namespace dan data backup
  const doc = await getDocument(id);
  if (!doc) {
    throw new DocumentOperationError(
      `Dokumen dengan ID '${id}' tidak ditemukan`,
      "DOCUMENT_NOT_FOUND",
    );
  }

  // 2. Hapus record dari database
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

  // 3. Hapus namespace dari Pinecone
  try {
    await deletePineconeNamespace(doc.namespace);
  } catch (error) {
    // Compensating transaction: re-insert record ke database
    console.error(
      `Pinecone delete gagal. Melakukan rollback: re-insert database record (${id})...`,
    );
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
      console.log("Rollback database (re-insert) berhasil.");
    } catch (rollbackError) {
      console.error(
        "CRITICAL: Rollback database juga gagal! Data inkonsisten mungkin terjadi.",
        rollbackError,
      );
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
 * Phase 1 (Synchronous): Validasi input, simpan record ke DB dengan status "processing".
 * Dipanggil di route handler SEBELUM response dikirim.
 * Return cepat agar client tidak timeout.
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

  // 1. Validasi format file berdasarkan documentType
  const validation = validateFileExtension(documentType, fileName);
  if (!validation.valid) {
    throw new DocumentUploadError(
      `Format file '${validation.fileExtension}' tidak didukung untuk documentType '${documentType}'. ` +
        `Format yang diizinkan: ${validation.allowedExtensions.join(", ")}`,
      "INVALID_FILE_FORMAT",
    );
  }

  // 2. Hitung file hash
  const fileHash = crypto.createHash("sha256").update(file).digest("hex");

  // 3. Parse effectiveDate jika ada
  const parsedEffectiveDate = effectiveDate
    ? new Date(effectiveDate)
    : null;

  // 4. Insert record ke database dengan status "processing"
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

  // 5. Return immediately — processing belum dimulai
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
 * Dipanggil via `after()` SETELAH response dikirim ke client.
 * Update status di DB saat selesai atau gagal.
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

  try {
    // 1. Siapkan konfigurasi chunker
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

    // 2. Jalankan chunking pipeline
    const chunks = await executeChunkerPipeline(
      documentType,
      file,
      chunkerConfig,
    );

    if (chunks.length === 0) {
      await updateDocumentProcessingStatus(
        documentId,
        "failed",
        "Dokumen tidak menghasilkan chunk. Pastikan dokumen memiliki konten yang valid.",
      );
      return;
    }

    // 3. Upsert ke Pinecone
    await upsertChunksPipeline(chunks, namespaceName);

    // 4. Update status ke "completed" dan totalChunks
    await updateDocumentTotalChunks(documentId, chunks.length);
    await updateDocumentProcessingStatus(documentId, "completed");

    console.log(
      `[Background] Dokumen ${documentId} berhasil diproses: ${chunks.length} chunks.`,
    );
  } catch (error) {
    // Update status ke "failed" dengan error message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";

    console.error(
      `[Background] Gagal memproses dokumen ${documentId}:`,
      error,
    );

    try {
      await updateDocumentProcessingStatus(documentId, "failed", errorMessage);
    } catch (updateError) {
      console.error(
        `[Background] CRITICAL: Gagal update status dokumen ${documentId}:`,
        updateError,
      );
    }

    // Compensating transaction: hapus DB record jika Pinecone belum ada data
    try {
      await deleteDocumentRecord(documentId);
      console.log(
        `[Background] Rollback: record ${documentId} dihapus dari database.`,
      );
    } catch (rollbackError) {
      console.error(
        `[Background] CRITICAL: Rollback gagal untuk ${documentId}:`,
        rollbackError,
      );
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

    await updateDocumentStatus(id, documentStatus);
  } catch (error) {
    console.error(`Gagal mengubah status dokumen dengan ID '${id}':`, error);
    throw error;
  }
}