import * as crypto from 'crypto';
import { cosineSimilarity, calculateStandardDeviation, getMeanEmbedding } from '@/lib/utils/vectorMath';
import { DocType, ChunkType, ChunkerConfig, ChunkData, ChunkMetadata } from '@/types/chunker';

import { pipeline } from '@xenova/transformers';

export interface SemanticConfig extends ChunkerConfig {
    modelName?: string;
    stdMultiplier?: number;
    overlapSentences?: number;
    minChunkSize?: number;
    maxChunkSize?: number;
}

export class AdaptiveSemanticChunker {
    private documentName: string;
    private documentVersion: string;
    private sourceFile: string;
    private fileHash: string;
    private docType: DocType;
    private language: string;
    private securityLevel: string;
    private effectiveDate: string | null;
    private status: string;
    
    private modelName: string;
    private stdMultiplier: number;
    private overlapSentences: number;
    private minChunkSize: number;
    private maxChunkSize: number;

    private extractor: any = null; // Instansiasi model pipeline

    constructor(config: SemanticConfig, fileHash: string, sourceFile: string) {
        const validDocTypes: DocType[] = ["legal_document", "procedure_sop", "educational_material", "faq", "news_event"];
        const inputDocType = config.docType || "educational_material";
        
        if (!validDocTypes.includes(inputDocType)) {
            throw new Error(`doc_type '${inputDocType}' tidak valid. Pilih dari: ${validDocTypes.join(", ")}`);
        }

        this.documentName = config.documentName;
        this.documentVersion = config.documentVersion || "v1.0";
        this.sourceFile = sourceFile;
        this.fileHash = fileHash;
        this.docType = inputDocType;
        this.language = config.language || "id";
        this.securityLevel = config.securityLevel || "public";
        this.effectiveDate = config.effectiveDate || null;
        this.status = config.status || "BERLAKU";

        this.modelName = config.modelName || "Xenova/multilingual-e5-base"; 
        this.stdMultiplier = config.stdMultiplier ?? 0.5;
        this.overlapSentences = config.overlapSentences ?? 1;
        this.minChunkSize = config.minChunkSize ?? 300;
        this.maxChunkSize = config.maxChunkSize ?? 1200;
    }

    private cleanText(text: string): string {
        let cleaned = text.replace(/\r/g, '\n');
        cleaned = cleaned.replace(/(?<=\w)-\n(?=\w)/g, ""); 
        return cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0).join(" ");
    }

    private splitSentences(text: string): string[] {
        // Regex SBD dengan Negative Lookbehind (didukung V8/Node.js)
        const sbdPattern = /(?<!\bPT)(?<!\bCV)(?<!\bRp)(?<!\bNo)(?<!\bTbk)(?<!\bHlm)(?<!\bPasal)(?<!\bBab)(?<!\b[A-Z])(?<=[.!?])\s+/gi;
        const sentences = text.split(sbdPattern);
        return sentences.map(s => s.trim()).filter(s => s.length > 5);
    }

    private async initModel() {
        if (!this.extractor) {
            // Memuat model ke dalam memori aplikasi Next.js
            this.extractor = await pipeline('feature-extraction', this.modelName);
        }
    }

    private async embed(texts: string[]): Promise<number[][]> {
        await this.initModel();
        const prefixedTexts = texts.map(t => `passage: ${t}`);
        
        // Output dari Transformers.js adalah Tensor, kita perlu mengekstrak array-nya
        const output = await this.extractor(prefixedTexts, { pooling: 'mean', normalize: true });
        return output.tolist();
    }

    private calculateAdaptiveThreshold(embeddings: number[][]): number {
        if (embeddings.length < 2) return 0.0;
        
        const baselineSims: number[] = [];
        for (let i = 0; i < embeddings.length - 1; i++) {
            const sim = cosineSimilarity(embeddings[i], embeddings[i + 1]);
            baselineSims.push(sim);
        }
        
        const meanSim = baselineSims.reduce((a, b) => a + b, 0) / baselineSims.length;
        const stdSim = calculateStandardDeviation(baselineSims, meanSim);
        
        return meanSim - (this.stdMultiplier * stdSim);
    }

    public async chunkText(rawText: string): Promise<ChunkData[]> {
        const text = this.cleanText(rawText);
        const sentences = this.splitSentences(text);

        if (sentences.length <= 1) return [];

        console.log(`Embedding ${sentences.length} sentences...`);
        const embeddings = await this.embed(sentences);
        const adaptiveThreshold = this.calculateAdaptiveThreshold(embeddings);
        
        console.log(`Computed Adaptive Threshold: ${adaptiveThreshold.toFixed(4)}`);

        const chunks: ChunkData[] = [];
        let chunkIndex = 1;

        const buildMetadata = (chunkId: string, combinedText: string, blockCount: number): ChunkMetadata => {
            let semanticChunkType: ChunkType = "semantic_block";
            if (this.docType === "educational_material") semanticChunkType = "concept_explanation";
            else if (this.docType === "news_event") semanticChunkType = "article_body";
            else if (this.docType === "procedure_sop") semanticChunkType = "policy_clause";

            return {
                document_name: this.documentName,
                document_version: this.documentVersion,
                source_file: this.sourceFile,
                file_hash: this.fileHash,
                doc_type: this.docType,
                language: this.language,
                chunk_id: chunkId,
                chunk_index: chunkIndex,
                source_char_count: combinedText.length,
                section_path: "SEMANTIC_INFERRED",
                chunk_type: semanticChunkType,
                security_level: this.securityLevel,
                effective_date: this.effectiveDate,
                status: this.status,
                created_at: new Date().toISOString(),
                ingest_method: "adaptive_semantic_llm"
            };
        };

        let currentChunkSentences: string[] = [sentences[0]];
        let currentChunkEmbeddings: number[][] = [embeddings[0]];

        for (let i = 1; i < sentences.length; i++) {
            const nextSentence = sentences[i];
            const nextEmb = embeddings[i];

            const chunkMeanEmb = getMeanEmbedding(currentChunkEmbeddings);
            const sim = cosineSimilarity(chunkMeanEmb, nextEmb);

            const currentCharLength = currentChunkSentences.join(" ").length;
            const nextCharLength = nextSentence.length;

            const isSemanticShift = sim < adaptiveThreshold;
            const isOverCapacity = (currentCharLength + nextCharLength) > this.maxChunkSize;

            if (isSemanticShift || isOverCapacity) {
                if (currentCharLength >= this.minChunkSize) {
                    const combinedText = currentChunkSentences.join(" ");
                    
                    // Injeksi Konteks (Contextual Payload)
                    const contextHeader = `[${this.documentName} | ${this.docType.toUpperCase()} | SEMANTIC]\n`;
                    const enrichedContent = contextHeader + combinedText;

                    const hashSum = crypto.createHash('sha256');
                    hashSum.update(combinedText, 'utf8');
                    const chunkId = `CHK_${hashSum.digest('hex').substring(0, 10).toUpperCase()}`;

                    chunks.push({
                        page_content: enrichedContent,
                        metadata: buildMetadata(chunkId, combinedText, currentChunkSentences.length)
                    });
                    chunkIndex++;

                    // Overlap logic
                    const overlapCount = Math.min(this.overlapSentences, currentChunkSentences.length);
                    currentChunkSentences = currentChunkSentences.slice(-overlapCount).concat(nextSentence);
                    currentChunkEmbeddings = currentChunkEmbeddings.slice(-overlapCount).concat([nextEmb]);
                } else {
                    currentChunkSentences.push(nextSentence);
                    currentChunkEmbeddings.push(nextEmb);
                }
            } else {
                currentChunkSentences.push(nextSentence);
                currentChunkEmbeddings.push(nextEmb);
            }
        }

        // Flush remaining chunk
        if (currentChunkSentences.length > 0) {
            const combinedText = currentChunkSentences.join(" ");
            if (combinedText.trim().length > 0) {
                const contextHeader = `[${this.documentName} | ${this.docType.toUpperCase()} | SEMANTIC]\n`;
                const enrichedContent = contextHeader + combinedText;

                const hashSum = crypto.createHash('sha256');
                hashSum.update(combinedText, 'utf8');
                const chunkId = `CHK_${hashSum.digest('hex').substring(0, 10).toUpperCase()}`;

                chunks.push({
                    page_content: enrichedContent,
                    metadata: buildMetadata(chunkId, combinedText, currentChunkSentences.length)
                });
            }
        }

        // Linked List metadata
        for (let i = 0; i < chunks.length; i++) {
            if (i > 0) chunks[i].metadata.previous_chunk_id = chunks[i - 1].metadata.chunk_id;
            if (i < chunks.length - 1) chunks[i].metadata.next_chunk_id = chunks[i + 1].metadata.chunk_id;
        }

        return chunks;
    }
}