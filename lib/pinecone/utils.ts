import { getPineconeNamespace } from ".";
import { withExponentialBackoff } from "../utils/retry";
import { pineconeClient } from "./client";
import {
  PineconeRecord,
  RecordMetadata,
  ScoredPineconeRecord,
} from "@pinecone-database/pinecone";
import { pineconeIndex } from ".";
import { getModuleLogger } from "@/lib/logger";

const log = getModuleLogger("lib/pinecone/utils");

// Mengimpor tipe dari implementasi chunker sebelumnya
import { ChunkData, ChunkMetadata } from "@/types/chunker";

/**
 * Filter dan transformasi metadata untuk diindeks oleh Pinecone.
 * Sesuai arsitektur Python, memindahkan page_content ke dalam metadata.text.
 */
function extractPineconeMetadata(chunk: ChunkData): RecordMetadata {
  const metaSource = chunk.metadata;
  const targetMeta: RecordMetadata = {};

  // Pinecone hanya menerima string, number, boolean, atau array of string dalam metadata
  const keysToExtract: (keyof ChunkMetadata)[] = [
    "document_name",
    "chunk_id",
    "source_file",
    "section_path",
    "chunk_type",
    "chunk_index",
  ];

  for (const key of keysToExtract) {
    if (metaSource[key] !== undefined && metaSource[key] !== null) {
      targetMeta[key] = metaSource[key] as string | number | boolean | string[];
    }
  }

  // Payload injeksi krusial untuk fase Retrieval
  targetMeta["text"] = chunk.page_content;

  return targetMeta;
}

/**
 * Pipeline lengkap: Transformasi -> Embedding -> Batching -> Upsert.
 */
export async function upsertChunksPipeline(
  chunks: ChunkData[],
  namespaceId: string,
  batchSize: number = 24, 
): Promise<void> {
  if (chunks.length === 0) return;

  // 1. Batasi ukuran batch maksimal 64 untuk mematuhi regulasi Inference API
  const safeBatchSize = Math.min(batchSize, 64);
  log.info({ chunkCount: chunks.length, batchSize: safeBatchSize, namespace: namespaceId }, "pinecone.upsert_started");

  const pineconeNs = getPineconeNamespace(namespaceId);

  // 2. Loop Utama: Siklus komputasi dan unggahan sekarang disatukan per batch
  for (let start = 0; start < chunks.length; start += safeBatchSize) {
    const batchChunks = chunks.slice(start, start + safeBatchSize);

    const ids = batchChunks.map(
      (c) => c.metadata.chunk_id || `chunk_${start}_${Math.random()}`,
    );
    const texts = batchChunks.map((c) => c.page_content);
    const metas = batchChunks.map((c) => extractPineconeMetadata(c));

    try {
      // 3. Komputasi Vektor via Inference API (Dilindungi Exponential Backoff)
      const embeddingResponse = await withExponentialBackoff(async () => {
        return await pineconeClient.inference.embed({
          model: "llama-text-embed-v2",
          inputs: texts,
          parameters: {
            inputType: "passage",
            truncate: "END",
          } as any,
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
          metadata: metas[i],
        });
      }

      // 5. Upserting ke Database (Dilindungi Exponential Backoff)
      await withExponentialBackoff(async () => {
        await pineconeNs.upsert({ records });
      });

      log.debug({ batchStart: start, batchEnd: start + records.length - 1, namespace: namespaceId }, "pinecone.batch_upserted");
    } catch (error) {
      log.error({ err: error, batchStart: start, namespace: namespaceId }, "pinecone.batch_upsert_failed");

      throw new Error("Gagal memproses batch indeks" + start + "setelah maksimum percobaan");
    }
  }
}

/**
 * Menghapus namespace pinecone beserta seluruh isinya
 */
export async function deletePineconeNamespace(namespace: string) {
  try {
    await pineconeIndex.deleteNamespace(namespace);
    log.info({ namespace }, "pinecone.namespace_deleted");
  } catch (error) {
    log.error({ err: error, namespace }, "pinecone.namespace_delete_failed");
    throw error;
  }
}

export async function retrieveRelevantChunks(
  question: string,
  namespaces: string[],
  namespaceTopK: number = 6,
  metadataFilter?: Record<string, unknown>,
  globalTopK: number = 30,
  minScoreThreshold: number = 0.2,
): Promise<ScoredPineconeRecord<RecordMetadata>[]> {
  log.debug({ namespaceCount: namespaces.length, topK: namespaceTopK }, "pinecone.query_embedding_started");

  let queryVector: number[];

  try {
    const queryEmbeddingResponse = await pineconeClient.inference.embed({
      model: "llama-text-embed-v2",
      inputs: [question],
      parameters: {
        inputType: "query",
        truncate: "END",
      } as any,
    });

    queryVector = (queryEmbeddingResponse.data[0] as { values: number[] })
      .values;
  } catch (error) {
    log.error({ err: error }, "pinecone.query_embedding_failed");
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
  const uniqueMatches = Array.from(
    new Map(allMatches.map((item) => [item.id, item])).values(),
  );

  // Filter berdasarkan Threshold Vektor
  const relevantMatches = uniqueMatches.filter(
    (m) => (m.score || 0) >= minScoreThreshold,
  );

  // Urutkan berdasarkan bobot semantik tertinggi
  relevantMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

  const topScore = relevantMatches[0]?.score ?? 0;
  log.info({ matchCount: relevantMatches.length, topScore, namespaceCount: namespaces.length }, "pinecone.retrieval_completed");

  return relevantMatches.slice(0, globalTopK);
}
