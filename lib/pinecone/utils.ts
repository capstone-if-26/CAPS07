import { getPineconeNamespace } from '.';
import { embedPassages, embedQuery } from '../embeddings/embedder';
import { withExponentialBackoff } from '../utils/retry';
import { PineconeRecord, RecordMetadata, ScoredPineconeRecord } from '@pinecone-database/pinecone';

// Mengimpor tipe dari implementasi chunker sebelumnya
import { ChunkData, ChunkMetadata } from '@/types/chunker';

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
    "chunk_index"
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
  batchSize: number = 100 // Default batch_size = 100
): Promise<void> {

  if (chunks.length === 0) return;

  console.log(`Memulai proses komputasi vektor untuk ${chunks.length} chunks...`);

  const ids = chunks.map(c => c.metadata.chunk_id);
  const texts = chunks.map(c => c.page_content);
  const metas = chunks.map(c => extractPineconeMetadata(c));

  // Komputasi vektor
  const vectors = await embedPassages(texts);

  // Perakitan Payload Pinecone SDK v2
  const records: PineconeRecord[] = [];
  for (let i = 0; i < ids.length; i++) {
    records.push({
      id: ids[i],
      values: vectors[i],
      metadata: metas[i]
    });
  }

  console.log(`Komputasi selesai. Memulai unggahan ke Pinecone (Batching per ${batchSize} chunk)...`);

  // Dapatkan koneksi ke namespace spesifik
  const pineconeNs = getPineconeNamespace(namespaceId);

  // Chunk array menjadi batch-batch kecil untuk mencegah request entity too large
  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records.slice(start, start + batchSize);

    // Gunakan wrapper retry eksponensial
    await withExponentialBackoff(async () => {
      await pineconeNs.upsert({ records: batch });
    });

    console.log(`Berhasil mengunggah batch indeks ${start} hingga ${start + batch.length - 1}`);
  }

  console.log(`Selesai! Berhasil mengunggah total ${records.length} vektor ke namespace '${namespaceId}'`);
}

/**
 * Melakukan pencarian Nearest Neighbor di ruang vektor Pinecone.
 */
export async function retrieveRelevantChunks(
  question: string,
  namespaces: string[],
  topK: number = 6, // Default TOP_K = 6
  metadataFilter?: Record<string, unknown>
): Promise<ScoredPineconeRecord<RecordMetadata>[]> {

  // 1. Transformasi pertanyaan menjadi vektor
  const queryVector = await embedQuery(question);

  // 2. Akses Namespaces secara paralel
  const promises = namespaces.map(async (ns) => {
    const pineconeNs = getPineconeNamespace(ns);
    const response = await pineconeNs.query({
      vector: queryVector,
      topK: topK,
      includeMetadata: true,
      filter: metadataFilter,
    });
    return response.matches;
  });

  // 3. Eksekusi pencarian vektor paralel
  const results = await Promise.all(promises);

  // 4. Gabungkan dan urutkan hasil
  let allMatches: ScoredPineconeRecord<RecordMetadata>[] = [];
  for (const matchArray of results) {
    allMatches = allMatches.concat(matchArray);
  }

  // Deduplicate berdasarkan chunk_id (untuk berjaga-jaga jika ada tumpang tindih)
  const uniqueMatches = Array.from(new Map(allMatches.map(item => [item.id, item])).values());

  // Urutkan ulang berdasarkan score teratas
  uniqueMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Ambil hanya topK dari keseluruhan namespace
  return uniqueMatches.slice(0, topK);
}