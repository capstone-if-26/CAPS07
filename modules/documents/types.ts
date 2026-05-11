import { DocType } from "@/types/chunker";

export interface UploadDocumentInput {
  file: Buffer;
  fileName: string;
  documentName: string;
  documentType: DocType;
  description: string;
  namespaceName: string;
  documentVersion?: string;
  language?: string;
  securityLevel?: string;
  effectiveDate?: string;
  statusDocument?: string;
  processingStatus?: string;
}

export interface UploadDocumentResult {
  documentId: string;
  documentType: DocType;
  processingStatus: "processing" | "completed" | "failed";
  fileName: string;
  namespace: string;
  fileHash: string;
  statusDocument: string;
  version: string;
  effectiveDate: Date | null;
  createdAt: Date;
}

export type CreateDocumentParam = {
  name: string;
  namespace: string;
  description: string;
  documentType: string;
  fileName: string;
  statusDocument?: string;
  version?: string;
  effectiveDate?: Date | null;
};
