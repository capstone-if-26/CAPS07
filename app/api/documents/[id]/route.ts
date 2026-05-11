import { NextRequest } from "next/server";
import {
  buildFailedResponse,
  buildSuccessResponse,
} from "@/lib/utils/response";
import {
  getDocumentById,
  deleteDocument,
  updateDocumentStatus,
} from "@/modules/documents/service";
import { DocumentOperationError } from "@/modules/documents/error";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return buildFailedResponse("Parameter 'id' wajib disertakan", null, 400);
    }

    const document = await getDocumentById(id);

    if (!document) {
      return buildFailedResponse(
        `Dokumen dengan ID '${id}' tidak ditemukan`,
        null,
        404,
      );
    }

    return buildSuccessResponse(document, "Berhasil mengambil detail dokumen");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return buildFailedResponse("Parameter 'id' wajib disertakan", null, 400);
    }

    const result = await deleteDocument(id);

    return buildSuccessResponse(result, "Dokumen berhasil dihapus");
  } catch (error: unknown) {
    if (error instanceof DocumentOperationError) {
      const statusMap: Record<string, number> = {
        DOCUMENT_NOT_FOUND: 404,
        DB_DELETE_FAILED: 500,
        PINECONE_DELETE_FAILED: 500,
      };

      const httpStatus = statusMap[error.code] || 500;
      return buildFailedResponse(
        error.message,
        { code: error.code },
        httpStatus,
      );
    }

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return buildFailedResponse("Parameter 'id' wajib disertakan", null, 400);
    }

    const { document_status } = await req.json();
    if (!document_status) {
      return buildFailedResponse("Parameter 'document_status' wajib disertakan", null, 400);
    }
    
    await updateDocumentStatus(id, document_status);

    return buildSuccessResponse(null, "Dokumen berhasil diupdate");
  } catch (error) {
    if (error instanceof DocumentOperationError) {
      const statusMap: Record<string, number> = {
        DOCUMENT_NOT_FOUND: 404,
        DB_DELETE_FAILED: 500,
        PINECONE_DELETE_FAILED: 500,
      };

      const httpStatus = statusMap[error.code] || 500;
      return buildFailedResponse(
        error.message,
        { code: error.code },
        httpStatus,
      );
    }

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return buildFailedResponse(message, error, 500);
  }
}
