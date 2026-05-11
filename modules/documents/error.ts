export type DocumentErrorCode =
  | "INVALID_FILE_FORMAT"
  | "CHUNKING_FAILED"
  | "EMPTY_CHUNKS"
  | "DB_INSERT_FAILED"
  | "PINECONE_UPSERT_FAILED";

export class DocumentUploadError extends Error {
  public readonly code: DocumentErrorCode;

  constructor(message: string, code: DocumentErrorCode) {
    super(message);
    this.name = "DocumentUploadError";
    this.code = code;
  }
}

export type DocumentOperationErrorCode =
  | "DOCUMENT_NOT_FOUND"
  | "DB_DELETE_FAILED"
  | "PINECONE_DELETE_FAILED";

export class DocumentOperationError extends Error {
  public readonly code: DocumentOperationErrorCode;

  constructor(message: string, code: DocumentOperationErrorCode) {
    super(message);
    this.name = "DocumentOperationError";
    this.code = code;
  }
}
