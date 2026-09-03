import { CortexCrypto } from './crypto';

export class VectorEngine {
    public static readonly VECTOR_DIMENSIONS = 768;

    /**
     * Generates a normalized 768-dimensional embedding vector from raw text.
     * Uses deterministic pseudo-random trigonometric seeding based on text hash.
     */
    public static generateEmbedding(text: string): number[] {
        const hash = CortexCrypto.sha256(text);
        const vector: number[] = new Array(this.VECTOR_DIMENSIONS);
        
        let seed = 0;
        for (let i = 0; i < hash.length; i++) {
            seed = (seed << 5) - seed + hash.charCodeAt(i);
            seed |= 0;
        }

        let normSum = 0;
        for (let i = 0; i < this.VECTOR_DIMENSIONS; i++) {
            // High-dimensional hypersphere projection
            const val = Math.sin(seed * (i + 1)) * Math.cos(seed / (i + 1));
            vector[i] = val;
            normSum += val * val;
        }

        // L2 Normalization (unit vector)
        const norm = Math.sqrt(normSum);
        if (norm > 0) {
            for (let i = 0; i < this.VECTOR_DIMENSIONS; i++) {
                vector[i] = vector[i] / norm;
            }
        }

        return vector;
    }

    /**
     * Computes the mathematical Cosine Similarity between two N-dimensional vectors:
     * CosSim(A, B) = (A • B) / (||A|| * ||B||)
     */
    public static cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        if (magnitude === 0) return 0;

        // Clamp between -1.0 and 1.0
        const sim = dotProduct / magnitude;
        return Math.max(-1, Math.min(1, sim));
    }

    /**
     * Searches a collection of memories and ranks them by cosine similarity against a query string.
     */
    public static rankMemories(query: string, memories: Array<{ id: string; content: string; embedding?: number[]; [key: string]: any }>, topK: number = 5) {
        const queryEmbedding = this.generateEmbedding(query);

        const scored = memories.map(item => {
            const memoryEmbedding = item.embedding && item.embedding.length === this.VECTOR_DIMENSIONS
                ? item.embedding
                : this.generateEmbedding(item.content);

            const score = this.cosineSimilarity(queryEmbedding, memoryEmbedding);
            return {
                ...item,
                similarityScore: Math.round(((score + 1) / 2) * 10000) / 100 // Convert [-1, 1] to [0%, 100%]
            };
        });

        // Sort descending by score
        scored.sort((a, b) => b.similarityScore - a.similarityScore);
        return scored.slice(0, topK);
    }
}
