
import { pipeline } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

// Mengamankan instance model dalam memori global untuk mencegah re-instansiasi pada Serverless/Edge
const globalForTransformers = globalThis as {
  extractor?: FeatureExtractionPipeline;
};
const resultCache = new Map<string, number[]>();

const MODEL_NAME = process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-base';

/**
 * Menginisialisasi model embedding. Menggunakan pola Singleton.
 */
async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!globalForTransformers.extractor) {
    console.log(`Loading local model ${MODEL_NAME} into memory...`);
    globalForTransformers.extractor = await pipeline(
      'feature-extraction',
      MODEL_NAME
    ) as FeatureExtractionPipeline; // optional cast (kadang perlu)
  }
  return globalForTransformers.extractor;
}

/**
 * Menambahkan label 'passage:' dan mengubah list string menjadi matriks vektor.
 * * @param texts Array of string yang akan di-embed
 * @returns Promise<number[][]> Matriks vektor 768-dimensi (atau sesuai model)
 */
export async function embedPassages(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();

  // Model e5 memerlukan prefix instruksional
  const prefixedTexts = texts.map((t) => `passage: ${t}`);

  // Eksekusi model dengan normalisasi L2 dan Mean Pooling secara default
  const output = await extractor(prefixedTexts, { pooling: 'mean', normalize: true });

  // Output adalah Tensor, kita perlu mengubahnya ke format multi-dimensi array murni
  return output.tolist();
}

/**
 * Mengubah pertanyaan natural language dari user menjadi array floating point.
 * Menggunakan prefiks 'query: ' sesuai spesifikasi model E5.
 */
export async function embedQuery(question: string): Promise<number[]> {
  // Cek apakah hasil untuk teks ini sudah pernah dihitung
  if (resultCache.has(question)) {
    return resultCache.get(question)!;
  }

  const extractor = await getExtractor();
  const qPrefixed = `query: ${question}`;
  const output = await extractor([qPrefixed], { pooling: 'mean', normalize: true });

  const vector = output.tolist()[0];

  // Simpan ke cache dengan pembatasan untuk menghindari memory leak
  if (resultCache.size > 1000) resultCache.clear();
  resultCache.set(question, vector);

  return vector;
}