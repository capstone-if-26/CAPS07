import * as path from "path";
import * as crypto from "crypto";
import { ChunkerConfig, ChunkData } from "@/types/chunker";
import { LegalRegexChunker } from "./legalRegexChunker";
import { FAQRegexChunker } from "./faqRegexChunker";
import { AdaptiveSemanticChunker } from "./adaptiveSemanticChunker";

/**
 * Konfigurasi strategi chunker per documentType.
 * Setiap entry mendefinisikan ekstensi file yang diizinkan dan factory function
 * untuk membuat instance chunker yang sesuai.
 */
interface ChunkerStrategyEntry {
  allowedExtensions: string[];
  createChunker: (config: ChunkerConfig) => {
    process: () => Promise<ChunkData[]>;
  } | {
    chunkText: (text: string) => Promise<ChunkData[]>;
    setFileHash: (hash: string) => void;
    initialize: () => Promise<void>;
  };
  processMode: "standard" | "semantic";
}

const strategyRegistry: Record<string, ChunkerStrategyEntry> = {
  legal_document: {
    allowedExtensions: [".pdf", ".docx"],
    createChunker: (config: ChunkerConfig) => new LegalRegexChunker(config),
    processMode: "standard",
  },
  faq: {
    allowedExtensions: [".pdf", ".docx"],
    createChunker: (config: ChunkerConfig) => new FAQRegexChunker(config),
    processMode: "standard",
  },
};

/** Default strategy untuk documentType selain legal_document dan faq */
const defaultStrategy: ChunkerStrategyEntry = {
  allowedExtensions: [".txt", ".md"],
  createChunker: (config: ChunkerConfig) => new AdaptiveSemanticChunker(config),
  processMode: "semantic",
};

/**
 * Mendapatkan strategy entry berdasarkan documentType.
 * Jika documentType tidak terdaftar di registry, menggunakan default strategy (adaptive semantic).
 */
export function getStrategy(documentType: string): ChunkerStrategyEntry {
  return strategyRegistry[documentType] || defaultStrategy;
}

/**
 * Memvalidasi apakah ekstensi file sesuai dengan documentType yang diberikan.
 * Mengembalikan objek validasi dengan status dan pesan error jika tidak valid.
 */
export function validateFileExtension(
  documentType: string,
  fileName: string,
): { valid: boolean; allowedExtensions: string[]; fileExtension: string } {
  const strategy = getStrategy(documentType);
  const fileExtension = path.extname(fileName).toLowerCase();
  return {
    valid: strategy.allowedExtensions.includes(fileExtension),
    allowedExtensions: strategy.allowedExtensions,
    fileExtension,
  };
}

/**
 * Pipeline utama: resolve strategy → instansiasi chunker → jalankan processing.
 * Mengembalikan array ChunkData hasil chunking.
 */
export async function executeChunkerPipeline(
  documentType: string,
  fileBuffer: Buffer,
  config: ChunkerConfig,
): Promise<ChunkData[]> {
  const strategy = getStrategy(documentType);
  const chunker = strategy.createChunker(config);

  if (strategy.processMode === "semantic") {
    // AdaptiveSemanticChunker membutuhkan initialize() dan chunkText()
    const semanticChunker = chunker as AdaptiveSemanticChunker;

    // Hitung file hash untuk metadata
    const fileHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");
    semanticChunker.setFileHash(fileHash);

    await semanticChunker.initialize();

    // Untuk semantic chunker, sourceInput berupa teks mentah
    const textContent = fileBuffer.toString("utf-8");
    return await semanticChunker.chunkText(textContent);
  }

  // Standard chunkers (Legal, FAQ) — gunakan process()
  const standardChunker = chunker as LegalRegexChunker | FAQRegexChunker;
  return await standardChunker.process();
}
