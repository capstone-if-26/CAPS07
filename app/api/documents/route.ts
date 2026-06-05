import { NextRequest, after } from "next/server";
import { buildFailedResponse, buildSuccessResponse } from "@/lib/utils/response";
import {
  initiateDocumentUpload,
  processDocumentInBackground,
  fetchAllAvailableDocuments,
} from "@/modules/documents/service";
import type { DocType } from "@/types/chunker";
import { DocumentUploadError } from "@/modules/documents/error";
import { getModuleLogger } from "@/lib/utils/logger";

const log = getModuleLogger("api/documents");

const VALID_DOC_TYPES: Set<string> = new Set([
  "legal_document",
  "procedure_sop",
  "educational_material",
  "faq",
  "news_event",
  "circular_letter",
  "attachment",
]);

export async function GET(req: NextRequest) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const reqLog = log.child({ request_id: requestId, method: "GET", path: "/api/documents" });

  reqLog.debug({}, "document.list_requested");

  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const documents = await fetchAllAvailableDocuments(search, page, limit);
    reqLog.info({ page, limit, total: documents.metadata.total, status: 200, duration: Date.now() - start }, "document.list_fetched");
    return buildSuccessResponse(documents, "Berhasil mengambil daftar dokumen");
  } catch (error: unknown) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "document.list_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const reqLog = log.child({ request_id: requestId, method: "POST", path: "/api/documents" });

  reqLog.debug({}, "document.upload_start");

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      reqLog.warn({ status: 400, duration: Date.now() - start }, "document.upload_invalid_form");
      return buildFailedResponse("Request harus berformat multipart/form-data", null, 400);
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return buildFailedResponse("Field 'file' wajib disertakan dan harus berupa file", null, 400);
    }

    const documentType = formData.get("documentType")?.toString()?.trim();
    if (!documentType) {
      return buildFailedResponse("Field 'documentType' wajib disertakan", null, 400);
    }

    if (!VALID_DOC_TYPES.has(documentType)) {
      return buildFailedResponse(
        `documentType '${documentType}' tidak dikenal. Gunakan salah satu: ${Array.from(VALID_DOC_TYPES).join(", ")}`,
        null,
        400,
      );
    }

    const documentName = formData.get("documentName")?.toString()?.trim();
    if (!documentName) {
      return buildFailedResponse("Field 'documentName' wajib disertakan", null, 400);
    }

    const namespaceName = formData.get("namespaceName")?.toString()?.trim();
    const description = formData.get("description")?.toString()?.trim();

    if (!namespaceName || !description) {
      return buildFailedResponse("Field 'namespaceName' dan 'description' wajib disertakan", null, 400);
    }

    const documentVersion = formData.get("documentVersion")?.toString()?.trim() || undefined;
    const language = formData.get("language")?.toString()?.trim() || undefined;
    const securityLevel = formData.get("securityLevel")?.toString()?.trim() || undefined;
    const effectiveDate = formData.get("effectiveDate")?.toString()?.trim() || undefined;
    const statusDocument = formData.get("statusDocument")?.toString()?.trim() || undefined;
    const status = formData.get("status")?.toString()?.trim() || undefined;

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

    reqLog.info({ documentType, fileName: file.name, fileSizeBytes: fileBuffer.byteLength }, "document.upload_initiated");
    const result = await initiateDocumentUpload(uploadInput);

    after(async () => {
      await processDocumentInBackground(result.documentId, uploadInput);
    });

    reqLog.info({ documentId: result.documentId, namespace: result.namespace, status: 202, duration: Date.now() - start }, "document.upload_accepted");
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
      reqLog.warn({ errorCode: error.code, status: httpStatus, duration: Date.now() - start }, "document.upload_rejected");
      return buildFailedResponse(error.message, { code: error.code }, httpStatus);
    }

    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "document.upload_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
