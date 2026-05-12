import { NextRequest, after } from "next/server";
import {
  buildFailedResponse,
  buildSuccessResponse,
} from "@/lib/utils/response";
import {
  initiateDocumentUpload,
  processDocumentInBackground,
  fetchAllAvailableDocuments,
} from "@/modules/documents/service";
import type { DocType } from "@/types/chunker";
import { DocumentUploadError } from "@/modules/documents/error";

const VALID_DOC_TYPES: Set<string> = new Set([
  "legal_document",
  "procedure_sop",
  "educational_material",
  "faq",
  "news_event",
  "circular_letter",
  "attachment"
]);

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const documents = await fetchAllAvailableDocuments(search, page, limit);
    return buildSuccessResponse(documents, "Berhasil mengambil daftar dokumen");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse FormData
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return buildFailedResponse(
        "Request harus berformat multipart/form-data",
        null,
        400,
      );
    }

    // 2. Ambil file dari FormData
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return buildFailedResponse(
        "Field 'file' wajib disertakan dan harus berupa file",
        null,
        400,
      );
    }

    // 3. Ambil dan validasi documentType
    const documentType = formData.get("documentType")?.toString()?.trim();
    if (!documentType) {
      return buildFailedResponse(
        "Field 'documentType' wajib disertakan",
        null,
        400,
      );
    }

    if (!VALID_DOC_TYPES.has(documentType)) {
      return buildFailedResponse(
        `documentType '${documentType}' tidak dikenal. Gunakan salah satu: ${Array.from(VALID_DOC_TYPES).join(", ")}`,
        null,
        400,
      );
    }

    // 4. Ambil dan validasi documentName
    const documentName = formData.get("documentName")?.toString()?.trim();
    if (!documentName) {
      return buildFailedResponse(
        "Field 'documentName' wajib disertakan",
        null,
        400,
      );
    }

    // 5. Ambil metadata wajib
    const namespaceName = formData.get("namespaceName")?.toString()?.trim();
    const description = formData.get("description")?.toString()?.trim();

    if (!namespaceName || !description) {
      return buildFailedResponse(
        "Field 'namespaceName' dan 'description' wajib disertakan",
        null,
        400,
      );
    }

    // 6. Ambil metadata opsional
    const documentVersion =
      formData.get("documentVersion")?.toString()?.trim() || undefined;
    const language =
      formData.get("language")?.toString()?.trim() || undefined;
    const securityLevel =
      formData.get("securityLevel")?.toString()?.trim() || undefined;
    const effectiveDate =
      formData.get("effectiveDate")?.toString()?.trim() || undefined;
    const statusDocument =
      formData.get("statusDocument")?.toString()?.trim() || undefined;
    const status =
      formData.get("status")?.toString()?.trim() || undefined;

    // 7. Konversi File ke Buffer (harus dilakukan sebelum response dikirim)
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const uploadInput = {
      file: fileBuffer,
      fileName: file.name,
      documentName,
      documentType: documentType as DocType,
      description,
      namespaceName,
      documentVersion,
      language,
      securityLevel,
      effectiveDate,
      statusDocument,
      status,
    };

    // 8. Phase 1 (Sync): Validasi + DB insert → return cepat
    const result = await initiateDocumentUpload(uploadInput);

    // 9. Phase 2 (Async): Chunking + Pinecone upsert → berjalan di background
    //    after() menjalankan callback SETELAH response dikirim ke client,
    //    sehingga client tidak perlu menunggu proses berat selesai.
    after(async () => {
      await processDocumentInBackground(result.documentId, uploadInput);
    });

    // 10. Return 202 Accepted — processing berlanjut di background
    return buildSuccessResponse(
      result,
      "Dokumen diterima dan sedang diproses. Gunakan GET /api/documents/{id} untuk memantau status.",
      202,
    );
  } catch (error: unknown) {
    if (error instanceof DocumentUploadError) {
      const statusMap: Record<string, number> = {
        INVALID_FILE_FORMAT: 400,
        CHUNKING_FAILED: 422,
        EMPTY_CHUNKS: 422,
        DB_INSERT_FAILED: 500,
        PINECONE_UPSERT_FAILED: 500,
      };

      const httpStatus = statusMap[error.code] || 500;
      return buildFailedResponse(error.message, { code: error.code }, httpStatus);
    }

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
