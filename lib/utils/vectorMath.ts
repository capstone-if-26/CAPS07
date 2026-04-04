// File: utils/vectorMath.ts

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

export function getMeanEmbedding(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    const dim = embeddings[0].length;
    const meanVec = new Array(dim).fill(0);
    
    // Sum all vectors
    for (const emb of embeddings) {
        for (let i = 0; i < dim; i++) {
            meanVec[i] += emb[i];
        }
    }
    
    // Average and calculate norm for L2 normalization
    let norm = 0;
    for (let i = 0; i < dim; i++) {
        meanVec[i] /= embeddings.length;
        norm += meanVec[i] * meanVec[i];
    }
    norm = Math.sqrt(norm);
    
    // Normalize
    if (norm > 0) {
        for (let i = 0; i < dim; i++) {
            meanVec[i] /= norm;
        }
    }
    return meanVec;
}