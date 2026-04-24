import { pineconeClient } from './client';
import { getPineconeNamespace } from './index';
import { withExponentialBackoff } from '../utils/retry';
import { PineconeRecord, RecordMetadata, ScoredPineconeRecord } from '@pinecone-database/pinecone';

import { ChunkData, ChunkMetadata } from '@/types/chunker';

function extractPineconeMetadata(chunk: ChunkData): RecordMetadata {
  const metaSource = chunk.metadata;
  const targetMeta: RecordMetadata = {};

  const keysToExtract: (keyof ChunkMetadata)[] = [
    "document_name",
    "chunk_id",
    "source_file",
    "section_path",
    "chunk_type",
    "chunk_index"
  ];

  for (const key of keysToExtract) {
    if (metaSource[key] !== undefined && metaSource[key] !== null) {
      targetMeta[key] = metaSource[key] as string | number | boolean | string[];
    }
  }

  targetMeta["text"] = chunk.page_content;
  return targetMeta;
}

/**
 * Pipeline lengkap: Transformasi -> Batching -> Inference (Cloud Embedding) -> Upsert.
 */
export async function upsertChunksPipeline(
  chunks: ChunkData[],
  namespaceId: string,
  batchSize: number = 100
): Promise<void> {

  if (chunks.length === 0) return;

  // 1. Batasi ukuran batch maksimal 100 untuk mematuhi regulasi Inference API
  const safeBatchSize = Math.min(batchSize, 100);
  console.log(`Memulai proses pipeline cloud untuk ${chunks.length} chunks (Batch: ${safeBatchSize})...`);

  const pineconeNs = getPineconeNamespace(namespaceId);

  // 2. Loop Utama: Siklus komputasi dan unggahan sekarang disatukan per batch
  for (let start = 0; start < chunks.length; start += safeBatchSize) {
    const batchChunks = chunks.slice(start, start + safeBatchSize);

    const ids = batchChunks.map(c => c.metadata.chunk_id || `chunk_${start}_${Math.random()}`);
    const texts = batchChunks.map(c => c.page_content);
    const metas = batchChunks.map(c => extractPineconeMetadata(c));

    try {
      // 3. Komputasi Vektor via Inference API (Dilindungi Exponential Backoff)
      const embeddingResponse = await withExponentialBackoff(async () => {
        return await pineconeClient.inference.embed({
          model: "llama-text-embed-v2",
          inputs: texts,
          parameters: {
            inputType: "passage",
            truncate: "END"
          } as any
        });
      });

      // 4. Perakitan Payload Pinecone
      const records: PineconeRecord[] = [];
      const vectorsData = embeddingResponse.data;

      for (let i = 0; i < ids.length; i++) {
        const currentVector = vectorsData[i];
        const denseValues = (currentVector as { values: number[] }).values;

        records.push({
          id: ids[i],
          values: denseValues,
          metadata: metas[i]
        });
      }

      // 5. Upserting ke Database (Dilindungi Exponential Backoff)
      await withExponentialBackoff(async () => {
        await pineconeNs.upsert({ records });
      });

      console.log(`  -> Berhasil mengunggah batch indeks ${start} hingga ${start + records.length - 1}`);

    } catch (error) {
      // Graceful degradation: Tangkap error agar tidak mematikan keseluruhan loop
      console.error(`[FATAL] Gagal memproses batch indeks ${start} setelah maksimum percobaan:`, error);
    }
  }

  console.log(`Selesai! Seluruh batch vektor telah diproses oleh Cloud ke namespace '${namespaceId}'`);
}

/**
 * Melakukan pencarian Nearest Neighbor di ruang vektor Pinecone.
 */
export async function retrieveRelevantChunks(
  question: string,
  namespaces: string[],
  namespaceTopK: number = 10,
  globalTopK: number = 30,
  minScoreThreshold: number = 0.2,
  metadataFilter?: Record<string, unknown>
): Promise<ScoredPineconeRecord<RecordMetadata>[]> {

  console.log(`Mengonversi pertanyaan ke dalam vektor (Cloud Inference)...`);

  let queryVector: number[];

  try {
    const queryEmbeddingResponse = await pineconeClient.inference.embed({
      model: "llama-text-embed-v2",
      inputs: [question],
      parameters: {
        inputType: "query",
        truncate: "END"
      } as any
    });

    queryVector = (queryEmbeddingResponse.data[0] as { values: number[] }).values;
  } catch (error) {
    console.error("Gagal melakukan embedding pada query pencarian:", error);
    throw error;
  }

  const promises = namespaces.map(async (ns) => {
    const pineconeNs = getPineconeNamespace(ns);
    const response = await pineconeNs.query({
      vector: queryVector,
      topK: namespaceTopK,
      includeMetadata: true,
      filter: metadataFilter,
    });
    return response.matches;
  });

  const results = await Promise.all(promises);

  let allMatches: ScoredPineconeRecord<RecordMetadata>[] = [];
  for (const matchArray of results) {
    allMatches = allMatches.concat(matchArray);
  }

  // Deduplikasi
  const uniqueMatches = Array.from(new Map(allMatches.map(item => [item.id, item])).values());

  // Filter berdasarkan Threshold Vektor
  const relevantMatches = uniqueMatches.filter(m => (m.score || 0) >= minScoreThreshold);

  // Urutkan berdasarkan bobot semantik tertinggi
  relevantMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

  console.log(`Ditemukan ${relevantMatches.length} kecocokan relevan. Skor teratas: ${relevantMatches[0].score}`);

  // Potong menggunakan Global Limit
  return relevantMatches.slice(0, globalTopK);
}