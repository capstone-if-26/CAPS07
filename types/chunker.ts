export type DocType =
  | "legal_document"
  | "procedure_sop"
  | "educational_material"
  | "faq"
  | "news_event"
  | "circular_letter"
  | "attachment";

export type ChunkType =
  | "article"
  | "preambule"
  | "policy_clause"
  | "qna_pair"
  | "general_section"
  | "semantic_block"
  | "concept_explanation"
  | "article_body";

export interface ChunkerConfig {
  sourceInput: string | Buffer;
  fileName: string;
  documentName: string;
  documentVersion?: string;
  docType?: DocType;
  language?: string;
  securityLevel?: string;
  effectiveDate?: string | null;
  processingStatus?: string;
}

export interface BlockData {
  id: string;
  page: number;
  text: string;
  char_len: number;
}

export interface ChunkMetadata {
  document_name: string;
  document_version: string;
  source_file: string;
  file_hash: string;
  doc_type: DocType;
  language: string;
  chunk_id: string;
  chunk_index: number;
  source_char_count: number;
  section_path: string;
  chunk_type: ChunkType;
  security_level: string;
  effective_date: string | null;
  status: string;
  created_at: string;
  ingest_method: string;
  source_format: string;
  previous_chunk_id: string | null;
  next_chunk_id: string | null;
}

export interface ChunkData {
  page_content: string;
  metadata: ChunkMetadata;
}
