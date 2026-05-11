import * as crypto from "crypto";
import { pipeline, FeatureExtractionPipeline } from "@xenova/transformers";
import {
  ChunkerConfig,
  ChunkMetadata,
  ChunkType,
  DocType,
} from "../../types/chunker";
import path from "path";

export class AdaptiveSemanticChunker {
  private readonly sourceInput: string | Buffer;
  private readonly fileName: string;
  private readonly documentName: string;
  private readonly documentVersion: string;
  private readonly fileExtension: string;
  private readonly docType: DocType;
  private readonly language: string;
  private readonly securityLevel: string;
  private readonly effectiveDate: string | null;
  private readonly status: string;
  private fileHash: string = "";

  private static readonly MODEL_NAME = "Xenova/multilingual-e5-base";
  private static readonly STD_MULTIPLIER = 0.5;
  private static readonly OVERLAP_SENTENCES = 1;
  private static readonly MIN_CHUNK_SIZE = 150;
  private static readonly MAX_CHUNK_SIZE = 1500;

  private extractor: FeatureExtractionPipeline | null = null;

  constructor(config: ChunkerConfig) {
    const validDocTypes = new Set<DocType>([
      "legal_document",
      "procedure_sop",
      "educational_material",
      "faq",
      "news_event",
    ]);
    this.docType = config.docType || "educational_material";

    if (!validDocTypes.has(this.docType)) {
      throw new Error(
        `doc_type '${this.docType}' tidak valid. Silakan gunakan standar tipe yang diizinkan.`,
      );
    }

    this.sourceInput = config.sourceInput;
    this.fileName = config.fileName;
    this.documentName = config.documentName;
    this.documentVersion = config.documentVersion || "v1.0";
    this.language = config.language || "id";
    this.securityLevel = config.securityLevel || "public";
    this.effectiveDate = config.effectiveDate || null;
    this.status = config.status || "BERLAKU";
    this.fileExtension = path.extname(this.fileName).toLowerCase();
  }

  public setFileHash(hash: string) {
    this.fileHash = hash;
  }

  public async initialize(): Promise<void> {
    if (!this.extractor) {
      this.extractor = await pipeline(
        "feature-extraction",
        AdaptiveSemanticChunker.MODEL_NAME,
      );
    }
  }

  private roundTo(value: number, decimals: number = 5): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getMeanEmbedding(embeddingsList: number[][]): number[] {
    if (embeddingsList.length === 0) return [];
    const dim = embeddingsList[0].length;
    const meanVec = new Array(dim).fill(0);

    for (const emb of embeddingsList) {
      for (let i = 0; i < dim; i++) meanVec[i] += emb[i];
    }

    let normSq = 0;
    for (let i = 0; i < dim; i++) {
      meanVec[i] /= embeddingsList.length;
      normSq += meanVec[i] * meanVec[i];
    }

    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) meanVec[i] /= norm;
    }
    return meanVec;
  }

  private calculateAdaptiveThreshold(embeddings: number[][]): number {
    if (embeddings.length < 2) return 0.0;
    const baselineSims: number[] = [];
    for (let i = 0; i < embeddings.length - 1; i++) {
      baselineSims.push(
        this.cosineSimilarity(embeddings[i], embeddings[i + 1]),
      );
    }

    const meanSim =
      baselineSims.reduce((a, b) => a + b, 0) / baselineSims.length;
    const variance =
      baselineSims.reduce((sq, n) => sq + Math.pow(n - meanSim, 2), 0) /
      baselineSims.length;
    const stdSim = Math.sqrt(variance);

    return meanSim - AdaptiveSemanticChunker.STD_MULTIPLIER * stdSim;
  }

  private cleanText(text: string): string {
    let cleaned = text.replace(/\r/g, "\n");
    cleaned = cleaned.replace(/(?<=\w)-\n(?=\w)/g, "");
    return cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ");
  }

  private splitSentences(text: string): string[] {
    const rawSegments = text.split(/(?<=[.!?])\s+/);
    
    const acronyms = new Set(["PT.", "CV.", "Rp.", "No.", "Tbk.", "Hlm.", "Pasal.", "Bab."]);
    const sentences: string[] = [];
    let buffer = "";

    for (const segment of rawSegments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      if (buffer) {
        buffer += " " + trimmed;
      } else {
        buffer = trimmed;
      }

      const words = buffer.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (!acronyms.has(lastWord)) {
        if (buffer.length > 5) {
          sentences.push(buffer);
        }
        buffer = "";
      }
    }

    if (buffer.length > 5) {
      sentences.push(buffer);
    }

    return sentences;
  }

  private async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.extractor) throw new Error("Extractor belum diinisialisasi.");
    const prefixedTexts = texts.map((t) => `passage: ${t}`);
    const output = await this.extractor(prefixedTexts, {
      pooling: "mean",
      normalize: true,
    });

    const embeddings: number[][] = [];
    const dim = output.dims[1];

    for (let i = 0; i < texts.length; i++) {
      const vec: number[] = [];
      for (let j = 0; j < dim; j++) vec.push(output.data[i * dim + j]);
      embeddings.push(vec);
    }
    return embeddings;
  }

  public async chunkText(text: string): Promise<any[]> {
    await this.initialize();

    const cleanedText = this.cleanText(text);
    const sentences = this.splitSentences(cleanedText);
    if (sentences.length <= 1) return [];

    const embeddings = await this.embedTexts(sentences);
    const adaptiveThreshold = this.calculateAdaptiveThreshold(embeddings);

    const chunks: any[] = [];
    let chunkIndex = 1;

    const buildMetadata = (
      chunkId: string,
      combinedText: string,
    ): ChunkMetadata => {
      let determinedChunkType: ChunkType = "general_section";

      if (this.docType === "legal_document") determinedChunkType = "article";
      else if (this.docType === "procedure_sop")
        determinedChunkType = "policy_clause";
      else if (this.docType === "faq") determinedChunkType = "qna_pair";

      return {
        document_name: this.documentName,
        source_format: this.fileExtension.replace(".", ""),
        document_version: this.documentVersion,
        source_file: this.fileName,
        file_hash: this.fileHash || "UNHASHED_BUFFER",
        doc_type: this.docType,
        language: this.language,
        chunk_id: chunkId,
        chunk_index: chunkIndex++,
        source_char_count: combinedText.length,
        section_path: "SEMANTIC_INFERRED",
        chunk_type: determinedChunkType,
        security_level: this.securityLevel,
        effective_date: this.effectiveDate,
        status: this.status,
        created_at: new Date().toISOString(),
        ingest_method: "adaptive_semantic_llm",
        previous_chunk_id: null,
        next_chunk_id: null,
      };
    };

    let currentChunkSentences: string[] = [sentences[0]];
    let currentChunkEmbeddings: number[][] = [embeddings[0]];

    for (let i = 1; i < sentences.length; i++) {
      const nextSentence = sentences[i];
      const nextEmb = embeddings[i];

      const chunkMeanEmb = this.getMeanEmbedding(currentChunkEmbeddings);
      const rawSim = this.cosineSimilarity(chunkMeanEmb, nextEmb);
      const sim = this.roundTo(rawSim, 5);
      const threshold = this.roundTo(adaptiveThreshold, 5);

      const currentCharLength = currentChunkSentences.reduce(
        (acc, s) => acc + s.length,
        0,
      );
      const nextCharLength = nextSentence.length;

      const isSemanticShift = sim < threshold;
      const isOverCapacity =
        currentCharLength + nextCharLength >
        AdaptiveSemanticChunker.MAX_CHUNK_SIZE;

      if (isSemanticShift || isOverCapacity) {
        if (currentCharLength >= AdaptiveSemanticChunker.MIN_CHUNK_SIZE) {
          const combinedText = currentChunkSentences.join(" ");
          const contentHash = crypto
            .createHash("sha256")
            .update(combinedText, "utf8")
            .digest("hex");
          const chunkId = `CHK_${contentHash.substring(0, 10).toUpperCase()}`;

          chunks.push({
            page_content: combinedText,
            metadata: buildMetadata(chunkId, combinedText),
          });

          const overlapCount = Math.min(
            AdaptiveSemanticChunker.OVERLAP_SENTENCES,
            currentChunkSentences.length,
          );
          currentChunkSentences = [
            ...currentChunkSentences.slice(-overlapCount),
            nextSentence,
          ];
          currentChunkEmbeddings = [
            ...currentChunkEmbeddings.slice(-overlapCount),
            nextEmb,
          ];
        } else {
          currentChunkSentences.push(nextSentence);
          currentChunkEmbeddings.push(nextEmb);
        }
      } else {
        currentChunkSentences.push(nextSentence);
        currentChunkEmbeddings.push(nextEmb);
      }
    }

    if (currentChunkSentences.length > 0) {
      const combinedText = currentChunkSentences.join(" ");
      if (combinedText.trim().length > 0) {
        const contentHash = crypto
          .createHash("sha256")
          .update(combinedText, "utf8")
          .digest("hex");
        const chunkId = `CHK_${contentHash.substring(0, 10).toUpperCase()}`;
        chunks.push({
          page_content: combinedText,
          metadata: buildMetadata(chunkId, combinedText),
        });
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0)
        chunks[i].metadata.previous_chunk_id = chunks[i - 1].metadata.chunk_id;
      if (i < chunks.length - 1)
        chunks[i].metadata.next_chunk_id = chunks[i + 1].metadata.chunk_id;
    }

    return chunks;
  }
}
