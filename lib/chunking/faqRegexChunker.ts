import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as mammoth from "mammoth";
import {
  DocType,
  ChunkType,
  ChunkerConfig,
  BlockData,
  ChunkMetadata,
  ChunkData,
} from "@/types/chunker";

interface ChunkFaqMetadata extends ChunkMetadata {
  question_number?: number;
  question_text?: string;
}

export class FAQRegexChunker {
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

  private static readonly REGEX_QUESTION = /^\s*#\s*(.+?)\s*$/;

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

    const validDocTypes = new Set<DocType>([
      "legal_document",
      "procedure_sop",
      "educational_material",
      "faq",
      "news_event",
    ]);
    this.docType = config.docType || "faq";

    if (!validDocTypes.has(this.docType)) {
      throw new Error(`doc_type '${this.docType}' tidak valid.`);
    }
  }

  private async getFileBuffer(): Promise<Buffer> {
    if (Buffer.isBuffer(this.sourceInput)) return this.sourceInput;
    return await fs.readFile(this.sourceInput as string);
  }

  private generateFileHash(fileBuffer: Buffer): string {
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  private cleanText(text: string): string {
    let cleaned = text.replace(/\r/g, "\n");
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned.trim();
  }

  private async extractBlocks(fileBuffer: Buffer): Promise<BlockData[]> {
    if (this.fileExtension === ".pdf") return this.extractBlocksPdf(fileBuffer);
    if (this.fileExtension === ".docx")
      return this.extractBlocksDocx(fileBuffer);
    throw new Error(`Format file ${this.fileExtension} belum didukung.`);
  }

  private async extractBlocksPdf(fileBuffer: Buffer): Promise<BlockData[]> {
    const data = new Uint8Array(fileBuffer);

    const loadingTask = pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
    });

    const pdf = await loadingTask.promise;

    const blocksData: BlockData[] = [];
    let blockId = 1;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lineMap = new Map<number, string[]>();

      for (const item of textContent.items) {
        if (!("str" in item) || !("transform" in item)) continue;

        const text = item.str?.trim();
        if (!text) continue;
        const y = Math.round(item.transform[5]);

        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }

        lineMap.get(y)!.push(text);
      }
      const sortedLines = [...lineMap.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([_, texts]) => texts.join(" ").trim())
        .filter(Boolean);

      let currentBlockLines: string[] = [];

      const flushBlock = () => {
        if (currentBlockLines.length === 0) return;

        const text = this.cleanText(currentBlockLines.join("\n"));

        if (text.length > 5) {
          blocksData.push({
            id: `BLK${String(blockId).padStart(5, "0")}`,
            page: pageNum,
            text,
            char_len: text.length,
          });

          blockId++;
        }

        currentBlockLines = [];
      };

      for (const line of sortedLines) {
        const isQuestion = /^\s*#\s+/.test(line);

        if (isQuestion) {
          flushBlock();
        }

        currentBlockLines.push(line);
      }
      flushBlock();
    }

    return blocksData;
  }

  private async extractBlocksDocx(fileBuffer: Buffer): Promise<BlockData[]> {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const rawBlocks = result.value.split("\n");
    const blocksData: BlockData[] = [];
    let blockId = 1;

    for (const text of rawBlocks) {
      const cleanedText = this.cleanText(text);
      if (cleanedText) {
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

  public async process(): Promise<ChunkData[]> {
    const fileBuffer = await this.getFileBuffer();
    const fileHash = this.generateFileHash(fileBuffer);
    const blocks = await this.extractBlocks(fileBuffer);

    const chunks: ChunkData[] = [];
    let chunkIndex = 1;

    let stateNomor = 0;
    let stateQuestionText: string | null = null;
    let currentChunkBlocks: BlockData[] = [];

    const finalizeChunk = () => {
      if (currentChunkBlocks.length === 0) return;

      const combinedText = currentChunkBlocks.map((b) => b.text).join("\n\n");
      const contentHash = crypto
        .createHash("sha256")
        .update(combinedText, "utf8")
        .digest("hex");
      const chunkId = `CHK_${contentHash.substring(0, 10).toUpperCase()}`;

      const sectionPath =
        stateNomor === 0
          ? "Preamble"
          : `Q${String(stateNomor).padStart(3, "0")}`;
      const determinedChunkType: ChunkType =
        stateNomor === 0 ? "preambule" : "qna_pair";

      const contextHeader = `[${this.documentName} | ${this.docType.toUpperCase()} | ${sectionPath}]\n`;

      const metadata: ChunkFaqMetadata = {
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
        chunk_type: determinedChunkType,
        security_level: this.securityLevel,
        effective_date: this.effectiveDate,
        status: this.status,
        created_at: new Date().toISOString(),
        ingest_method: "regex_automaton_markdown",
        source_format: this.fileExtension.replace(".", ""),
        previous_chunk_id: null,
        next_chunk_id: null,
      };

      if (stateNomor > 0 && stateQuestionText) {
        metadata.question_number = stateNomor;
        metadata.question_text = stateQuestionText;
      }

      chunks.push({
        page_content: contextHeader + combinedText,
        metadata: metadata,
      });
    };

    for (const block of blocks) {
      const text = block.text;

      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const firstQuestionLine = lines.find((l) => /^\s*#\s*\d+\./.test(l) || /^\s*#\s*/.test(l));

      if (firstQuestionLine) {
        finalizeChunk();
        stateNomor++;
        stateQuestionText = firstQuestionLine.replace(/^\s*#\s*/, "").trim();
        currentChunkBlocks = [block];
      } else {
        currentChunkBlocks.push(block);
      }
    }

    finalizeChunk();

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0)
        chunks[i].metadata.previous_chunk_id = chunks[i - 1].metadata.chunk_id;
      if (i < chunks.length - 1)
        chunks[i].metadata.next_chunk_id = chunks[i + 1].metadata.chunk_id;
    }

    return chunks;
  }
}
