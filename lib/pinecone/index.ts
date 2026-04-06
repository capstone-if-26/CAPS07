import { pineconeClient } from './client';

const indexName = process.env.PINECONE_INDEX_NAME;

if (!indexName) {
  throw new Error('PINECONE_INDEX_NAME environment variable is missing.');
}

// Mengunci instance ke Index spesifik yang sudah kita buat di dashboard Pinecone.
// Tipe data RecordMetadata adalah generic, bisa Anda sesuaikan dengan struktur metadata Anda.
export const pineconeIndex = pineconeClient.Index(indexName);

/**
 * Helper function: Mengambil Namespace spesifik.
 * Sangat berguna untuk isolasi data multi-tenant.
 * * @param namespace - String unik, biasanya berupa User ID atau Organization ID
 */
export const getPineconeNamespace = (namespace: string) => {
  return pineconeIndex.namespace(namespace);
};

// Ekspor juga tipe dasarnya jika dibutuhkan di Service Layer / Modules
export type PineconeIndexType = typeof pineconeIndex;