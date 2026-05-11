import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as mammoth from "mammoth";
import {
  DocType,
  ChunkType,
  ChunkerConfig,
  BlockData,
  ChunkData,
} from "@/types/chunker";

export class LegalRegexChunker {
  private readonly sourceInput: string | Buffer;
  private readonly fileName: string;
  private readonly fileExtension: string;
  private readonly documentName: string;
  private readonly documentVersion: string;
  private readonly docType: DocType;
  private readonly language: string;
  private readonly securityLevel: string;
  private readonly effectiveDate: string | null;
  private readonly status: string;

  private readonly regexBab = /^\s*BAB\s+[IVXLCDM]+\b/i;
  private readonly regexBagian =
    /^\s*Bagian\s+(?:Kesatu|Kedua|Ketiga|Keempat|Kelima|Keenam|Ketujuh|Kedelapan|Kesembilan|Kesepuluh|Kesebelas|Keduabelas|[A-Z0-9IVXLCDM]+)\b/i;
  private readonly regexParagraf = /^\s*Paragraf\s+\d+\b/i;
  private readonly regexPasal = /^\s*Pasal\s+\d+[a-zA-Z]?\b/i;

  constructor(config: ChunkerConfig) {
    this.sourceInput = config.sourceInput;
    this.fileName = config.fileName;
    this.fileExtension = path.extname(this.fileName).toLowerCase();

    this.documentName = config.documentName;
    this.documentVersion = config.documentVersion || "v1.0";
    this.language = config.language || "id";
    this.securityLevel = config.securityLevel || "public";
    this.effectiveDate = config.effectiveDate || null;
    this.status = config.status || "BERLAKU";

    const validDocTypes: Set<DocType> = new Set([
      "legal_document",
      "procedure_sop",
      "educational_material",
      "faq",
      "news_event",
    ]);
    this.docType = config.docType || "legal_document";

    if (!validDocTypes.has(this.docType)) {
      throw new Error(`doc_type '${this.docType}' tidak valid.`);
    }
  }

  /**
   * Menyelesaikan file input menjadi Buffer (baik dari path disk maupun direct buffer)
   */
  private async getFileBuffer(): Promise<Buffer> {
    if (Buffer.isBuffer(this.sourceInput)) {
      return this.sourceInput;
    }
    return await fs.readFile(this.sourceInput as string);
  }

  /**
   * Generate representasi deterministik (SHA-256)
   */
  private async generateFileHash(fileBuffer: Buffer): Promise<string> {
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  }

  /**
   * Normalisasi string dengan regex global
   */
  private cleanText(text: string): string {
    let cleaned = text.replace(/\r/g, "\n");
    cleaned = cleaned.replace(/(?<=\w)-\n(?=\w)/g, "");

    return cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ");
  }

  /**
   * Factory untuk ekstraksi berdasarkan format file
   */
  private async extractBlocks(fileBuffer: Buffer): Promise<BlockData[]> {
    if (this.fileExtension === ".pdf") {
      return this.extractBlocksPdf(fileBuffer);
    } else if (this.fileExtension === ".docx") {
      return this.extractBlocksDocx(fileBuffer);
    } else {
      throw new Error(
        `Format ${this.fileExtension} tidak didukung. Gunakan PDF atau DOCX.`,
      );
    }
  }

  /**
   * Ekstraksi PDF Asinkron menggunakan pdfjs-dist
   */
  private async extractBlocksPdf(fileBuffer: Buffer): Promise<BlockData[]> {
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const blocksData: BlockData[] = [];
    let blockId = 1;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let currentBlockText = "";
      let lastY = -1;

      for (const item of textContent.items) {
        if ("str" in item && "transform" in item) {
          const currentY = item.transform[5];
          const textStr = item.str;

          if (lastY !== -1) {
            const deltaY = Math.abs(lastY - currentY);
            
            if (deltaY > 10) {
              const isStructuralKeyword = /^\s*(BAB|Bagian|Paragraf|Pasal)\b/i.test(textStr);

              if (deltaY > 20 || isStructuralKeyword) {
                currentBlockText += "\n\n"; 
              } else {
                currentBlockText += "\n"; 
              }
            }
          }
          
          currentBlockText += textStr;
          lastY = currentY;
        }
      }

      const rawBlocks = currentBlockText.split(/\n\s*\n/);

      for (const rawText of rawBlocks) {
        const cleanedText = this.cleanText(rawText);
        if (cleanedText.length > 5) {
          blocksData.push({
            id: `BLK${String(blockId).padStart(5, "0")}`,
            page: pageNum,
            text: cleanedText,
            char_len: cleanedText.length,
          });
          blockId++;
        }
      }
    }
    return blocksData;
  }

  /**
   * Ekstraksi DOCX menggunakan Mammoth
   */
  private async extractBlocksDocx(fileBuffer: Buffer): Promise<BlockData[]> {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const rawText = result.value;
    const rawBlocks = rawText.split("\n");

    const blocksData: BlockData[] = [];
    let blockId = 1;

    for (const text of rawBlocks) {
      const cleanedText = this.cleanText(text);
      if (cleanedText.length > 5) {
        blocksData.push({
          id: `BLK${String(blockId).padStart(5, "0")}`,
          page: 1,
          text: cleanedText,
          char_len: cleanedText.length,
        });
        blockId++;
      }
    }
    return blocksData;
  }

  /**
   * Core Processing: Evaluasi State Machine & Chunking
   */
  public async process(): Promise<ChunkData[]> {
    const fileBuffer = await this.getFileBuffer();
    const fileHash = await this.generateFileHash(fileBuffer);
    const blocks = await this.extractBlocks(fileBuffer);

    const chunks: ChunkData[] = [];
    let chunkIndex = 1;

    // State Trackers
    let stateBab: string | null = null;
    let stateBagian: string | null = null;
    let stateParagraf: string | null = null;
    let statePasal: string = "Preambule";

    let currentChunkBlocks: BlockData[] = [];

    const finalizeChunk = () => {
      if (currentChunkBlocks.length === 0) return;

      const combinedText = currentChunkBlocks.map((b) => b.text).join("\n\n");

      // Hash persisten untuk Chunk ID
      const contentHash = crypto
        .createHash("sha256")
        .update(combinedText, "utf8")
        .digest("hex");
      const chunkId = `CHK_${contentHash.substring(0, 10).toUpperCase()}`;

      const pathComponents = [
        stateBab,
        stateBagian,
        stateParagraf,
        statePasal,
      ].filter(Boolean) as string[];
      const sectionPath =
        pathComponents.length > 0 ? pathComponents.join(" > ") : "UNSTRUCTURED";

      let chunkType: ChunkType = "general_section";
      if (this.docType === "legal_document") {
        chunkType =
          statePasal && statePasal !== "Preambule" ? "article" : "preambule";
      } else if (this.docType === "procedure_sop") {
        chunkType = "policy_clause";
      } else if (this.docType === "faq") {
        chunkType = "qna_pair";
      }

      const contextHeader = `[${this.documentName} | ${this.docType.toUpperCase()} | ${sectionPath}]\n`;

      chunks.push({
        page_content: contextHeader + combinedText,
        metadata: {
          document_name: this.documentName,
          document_version: this.documentVersion,
          source_file: this.fileName,
          file_hash: fileHash,
          doc_type: this.docType,
          language: this.language,
          chunk_id: chunkId,
          chunk_index: chunkIndex++,
          source_char_count: combinedText.length,
          section_path: sectionPath,
          chunk_type: chunkType,
          security_level: this.securityLevel,
          effective_date: this.effectiveDate,
          status: this.status,
          created_at: new Date().toISOString(),
          ingest_method: "regex_automaton",
          source_format: this.fileExtension.replace(".", ""),
          previous_chunk_id: null,
          next_chunk_id: null,
        },
      });
    };

    // Automaton: Transisi State berdasarkan konten Blok
    for (const block of blocks) {
      const text = block.text;

      if (this.regexBab.test(text)) {
        stateBab = text;
        stateBagian = null;
        stateParagraf = null;
      } else if (this.regexBagian.test(text)) {
        stateBagian = text;
        stateParagraf = null;
      } else if (this.regexParagraf.test(text)) {
        stateParagraf = text;
      }

      if (this.regexPasal.test(text)) {
        finalizeChunk();
        statePasal = text;
        currentChunkBlocks = [block];
      } else {
        currentChunkBlocks.push(block);
      }
    }

    finalizeChunk();

    // POST-PROCESSING: Membuat Double Linked-List untuk navigasi LLM
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0)
        chunks[i].metadata.previous_chunk_id = chunks[i - 1].metadata.chunk_id;
      if (i < chunks.length - 1)
        chunks[i].metadata.next_chunk_id = chunks[i + 1].metadata.chunk_id;
    }

    return chunks;
  }
}
