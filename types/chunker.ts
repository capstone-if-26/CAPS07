export type DocType = "legal_document" | "procedure_sop" | "educational_material" | "faq" | "news_event";
export type ChunkType = "article" | "preambule" | "policy_clause" | "qna_pair" | "general_section" | "semantic_block" | "concept_explanation" | "article_body";

export interface ChunkerConfig {
    pdfPath: string;
    documentName: string;
    documentVersion?: string;
    docType?: DocType;
    language?: string;
    securityLevel?: string;
    effectiveDate?: string | null;
    status?: string;
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
    previous_chunk_id?: string | null;
    next_chunk_id?: string | null;
}

export interface ChunkData {
    page_content: string;
    metadata: ChunkMetadata;
}