import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
    DocType, 
    ChunkType, 
    ChunkerConfig, 
    BlockData, 
    ChunkData, 
    ChunkMetadata 
} from '@/types/chunker';

import * as pdfjsLib from 'pdfjs-dist';

export class LegalRegexChunker {
    private pdfPath: string;
    private documentName: string;
    private documentVersion: string;
    private docType: DocType;
    private language: string;
    private securityLevel: string;
    private effectiveDate: string | null;
    private status: string;
    private sourceFile: string;
    
    // RegEx Engine (JavaScript RegExp)
    private regexBab: RegExp = /^\s*BAB\s+[IVXLCDM]+\b/i;
    private regexBagian: RegExp = /^\s*Bagian\s+(?:Kesatu|Kedua|Ketiga|Keempat|Kelima|Keenam|Ketujuh|Kedelapan|Kesembilan|Kesepuluh|Kesebelas|Keduabelas|[A-Z0-9IVXLCDM]+)\b/i;
    private regexParagraf: RegExp = /^\s*Paragraf\s+\d+\b/i;
    private regexPasal: RegExp = /^\s*Pasal\s+\d+[a-zA-Z]?\b/i;

    constructor(config: ChunkerConfig) {
        this.pdfPath = config.pdfPath;
        this.documentName = config.documentName;
        this.documentVersion = config.documentVersion || "v1.0";
        this.language = config.language || "id";
        this.securityLevel = config.securityLevel || "public";
        this.effectiveDate = config.effectiveDate || null;
        this.status = config.status || "BERLAKU";
        
        this.sourceFile = path.basename(this.pdfPath);

        const validDocTypes: DocType[] = ["legal_document", "procedure_sop", "educational_material", "faq", "news_event"];
        const inputDocType = config.docType || "legal_document";
        
        if (!validDocTypes.includes(inputDocType)) {
            throw new Error(`doc_type '${inputDocType}' tidak valid. Pilih dari: ${validDocTypes.join(", ")}`);
        }
        this.docType = inputDocType;
    }

    /**
     * Menghasilkan representasi deterministik (SHA-256) secara sinkron.
     * Karena file bisa berukuran besar di backend, idealnya ini dibaca via buffer.
     */
    private generateFileHash(): string {
        const fileBuffer = fs.readFileSync(this.pdfPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    /**
     * Normalisasi string tingkat lanjut.
     * Menggunakan Regex global (/g) di JS untuk me-replace semua kemunculan.
     */
    private cleanText(text: string): string {
        let cleaned = text.replace(/\r/g, '\n');
        // Negative Lookbehind didukung penuh di Node.js modern (V8 engine)
        cleaned = cleaned.replace(/(?<=\w)-\n(?=\w)/g, ""); 
        
        const lines = cleaned.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
        return lines.join(" ");
    }

    /**
     * Ekstraksi blok teks.
     * Mengingat di Node.js kita menggunakan pdfjs-dist, kita harus melakukan iterasi halaman asinkron.
     */
    private async extractBlocks(): Promise<BlockData[]> {
        const data = new Uint8Array(fs.readFileSync(this.pdfPath));
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        
        const blocksData: BlockData[] = [];
        let blockId = 1;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // pdfjs-dist mengembalikan array dari 'items'. 
            // Kita perlu merakitnya kembali menjadi blok semu karena ia tidak memiliki fungsi get_text("blocks") sekuat PyMuPDF.
            let currentBlockText = "";
            let lastY = -1;

            for (const item of textContent.items) {
                if ('str' in item) {
                    // Logika heuristik sederhana untuk mendeteksi baris baru berdasarkan koordinat Y
                    const currentY = item.transform[5]; 
                    if (lastY !== -1 && Math.abs(lastY - currentY) > 12) {
                        currentBlockText += "\n";
                    }
                    currentBlockText += item.str;
                    lastY = currentY;
                }
            }

            // Pisahkan blok heuristik ini berdasarkan paragraf ganda
            const rawBlocks = currentBlockText.split(/\n\s*\n/);
            
            for (const rawText of rawBlocks) {
                const cleanedText = this.cleanText(rawText);
                if (cleanedText.length > 5) {
                    blocksData.push({
                        id: `BLK${String(blockId).padStart(5, '0')}`,
                        page: pageNum,
                        text: cleanedText,
                        char_len: cleanedText.length
                    });
                    blockId++;
                }
            }
        }
        return blocksData;
    }

    /**
     * State Machine Processing
     * Fungsi ini sekarang menjadi async karena proses ekstraksi PDF asinkron.
     */
    public async process(): Promise<ChunkData[]> {
        const fileHash = this.generateFileHash();
        const blocks = await this.extractBlocks();
        const chunks: ChunkData[] = [];
        
        let chunkIndex = 1;
        
        // State Trackers
        let stateBab: string | null = null;
        let stateBagian: string | null = null;
        let stateParagraf: string | null = null;
        let statePasal: string = "Preambule";
        
        let currentChunkBlocks: BlockData[] = [];

        // Di TS/JS, closure secara otomatis menangkap referensi variabel dari lexical scope
        const finalizeChunk = () => {
            if (currentChunkBlocks.length === 0) return;

            const combinedText = currentChunkBlocks.map(b => b.text).join("\n\n");
            
            // Pembuatan Hash untuk ID
            const hashSum = crypto.createHash('sha256');
            hashSum.update(combinedText, 'utf8');
            const contentHash = hashSum.digest('hex');
            const chunkId = `CHK_${contentHash.substring(0, 10).toUpperCase()}`;

            const pathComponents = [stateBab, stateBagian, stateParagraf, statePasal].filter(Boolean) as string[];
            const sectionPath = pathComponents.length > 0 ? pathComponents.join(" > ") : "UNSTRUCTURED";

            // Dinamisasi chunk_type
            let chunkType: ChunkType = "general_section";
            if (this.docType === "legal_document") {
                chunkType = statePasal.includes("Pasal") ? "article" : "preambule";
            } else if (this.docType === "procedure_sop") {
                chunkType = "policy_clause";
            } else if (this.docType === "faq") {
                chunkType = "qna_pair";
            }

            const contextHeader = `[${this.documentName} | ${this.docType.toUpperCase()} | ${sectionPath}]\n`;
            const enrichedContent = contextHeader + combinedText;

            const metadata: ChunkMetadata = {
                document_name: this.documentName,
                document_version: this.documentVersion,
                source_file: this.sourceFile,
                file_hash: fileHash,
                doc_type: this.docType,
                language: this.language,
                chunk_id: chunkId,
                chunk_index: chunkIndex,
                source_char_count: combinedText.length,
                section_path: sectionPath,
                chunk_type: chunkType,
                security_level: this.securityLevel,
                effective_date: this.effectiveDate,
                status: this.status,
                created_at: new Date().toISOString(),
                ingest_method: "regex_automaton",
                previous_chunk_id: null,
                next_chunk_id: null
            };

            chunks.push({
                page_content: enrichedContent,
                metadata: metadata
            });

            chunkIndex++;
        };

        // Iterasi Evaluasi State
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

        // POST-PROCESSING: Linked List untuk navigasi sekuensial
        for (let i = 0; i < chunks.length; i++) {
            if (i > 0) {
                chunks[i].metadata.previous_chunk_id = chunks[i - 1].metadata.chunk_id;
            }
            if (i < chunks.length - 1) {
                chunks[i].metadata.next_chunk_id = chunks[i + 1].metadata.chunk_id;
            }
        }

        return chunks;
    }
}