import { NextRequest } from "next/server";
import { buildFailedResponse, buildSuccessResponse } from "@/lib/utils/response";
import { getDocumentById, deleteDocument, updateDocumentStatus } from "@/modules/documents/service";
import { DocumentOperationError } from "@/modules/documents/error";
import { getModuleLogger } from "@/lib/logger";

const log = getModuleLogger("api/documents/[id]");

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await context.params;
  const reqLog = log.child({ request_id: requestId, method: "GET", path: `/api/documents/${id}`, documentId: id });

  reqLog.debug({}, "document.fetch_requested");

  try {
    if (!id) {
      return buildFailedResponse("Parameter 'id' wajib disertakan", null, 400);
    }

    const document = await getDocumentById(id);

    if (!document) {
      reqLog.warn({ status: 404, duration: Date.now() - start }, "document.not_found");
      return buildFailedResponse(`Dokumen dengan ID '${id}' tidak ditemukan`, null, 404);
    }

    reqLog.info({ status: 200, duration: Date.now() - start }, "document.fetched");
    return buildSuccessResponse(document, "Berhasil mengambil detail dokumen");
  } catch (error: unknown) {
    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "document.fetch_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await context.params;
  const reqLog = log.child({ request_id: requestId, method: "DELETE", path: `/api/documents/${id}`, documentId: id });

  reqLog.info({}, "document.delete_requested");

  try {
    if (!id) {
      return buildFailedResponse("Parameter 'id' wajib disertakan", null, 400);
    }

    const result = await deleteDocument(id);
    reqLog.info({ status: 200, duration: Date.now() - start }, "document.deleted");
    return buildSuccessResponse(result, "Dokumen berhasil dihapus");
  } catch (error: unknown) {
    if (error instanceof DocumentOperationError) {
      const statusMap: Record<string, number> = {
        DOCUMENT_NOT_FOUND: 404,
        DB_DELETE_FAILED: 500,
        PINECONE_DELETE_FAILED: 500,
      };
      const httpStatus = statusMap[error.code] || 500;
      reqLog.warn({ errorCode: error.code, status: httpStatus, duration: Date.now() - start }, "document.delete_rejected");
      return buildFailedResponse(error.message, { code: error.code }, httpStatus);
    }

    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "document.delete_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const { id } = await context.params;
  const reqLog = log.child({ request_id: requestId, method: "PATCH", path: `/api/documents/${id}`, documentId: id });

  reqLog.debug({}, "document.status_update_requested");

  try {
    if (!id) {
      return buildFailedResponse("Parameter 'id' wajib disertakan", null, 400);
    }

    const { document_status } = await req.json();
    if (!document_status) {
      reqLog.warn({ status: 400, duration: Date.now() - start }, "document.status_update_rejected");
      return buildFailedResponse("Parameter 'document_status' wajib disertakan", null, 400);
    }

    await updateDocumentStatus(id, document_status);
    reqLog.info({ newStatus: document_status, status: 200, duration: Date.now() - start }, "document.status_updated");
    return buildSuccessResponse(null, "Dokumen berhasil diupdate");
  } catch (error) {
    if (error instanceof DocumentOperationError) {
      const statusMap: Record<string, number> = {
        DOCUMENT_NOT_FOUND: 404,
        DB_DELETE_FAILED: 500,
        PINECONE_DELETE_FAILED: 500,
      };
      const httpStatus = statusMap[error.code] || 500;
      reqLog.warn({ errorCode: error.code, status: httpStatus, duration: Date.now() - start }, "document.status_update_rejected");
      return buildFailedResponse(error.message, { code: error.code }, httpStatus);
    }

    reqLog.error({ err: error, status: 500, duration: Date.now() - start }, "document.status_update_failed");
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
