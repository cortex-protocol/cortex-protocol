import { CortexCrypto } from './crypto';

export type MemoryType = 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL' | 'KNOWLEDGE_BASE';
export type AccessLevel = 'PUBLIC' | 'ENCRYPTED_PRIVATE' | 'CONSORTIUM_SHARED';

export interface AIMemoryPayload {
    agentId: string;             // Identifier of the AI Agent (e.g. "oracle-coder-v1")
    agentPublicKey: string;      // Public key of the Agent / Creator
    memoryType: MemoryType;      // Type of AI memory
    topic: string;               // High-level topic / domain (e.g. "defi-arbitrage", "code-refactor")
    content: string;             // The factual memory or encrypted ciphertext
    embeddingDimensions?: number;// Number of vector dimensions (e.g. 768, 1536)
    vectorHash: string;          // Cryptographic hash of the embedding vector
    accessLevel: AccessLevel;    // Visibility permission
    metadata?: Record<string, any>; // Extra metadata (confidence, model used, etc.)
}

export class AIMemoryUnit {
    public id: string;
    public timestamp: number;
    public payload: AIMemoryPayload;

    constructor(payload: AIMemoryPayload, timestamp = Date.now()) {
        this.payload = payload;
        this.timestamp = timestamp;
        this.id = this.calculateId();
    }

    /**
     * Compute deterministic unique memory ID
     */
    public calculateId(): string {
        const raw = `${this.payload.agentId}:${this.payload.agentPublicKey}:${this.payload.topic}:${this.payload.vectorHash}:${this.timestamp}`;
        return CortexCrypto.sha256(raw);
    }

    /**
     * Helper to compute vector hash from float array embedding
     */
    static computeVectorHash(vector: number[]): string {
        const buffer = Buffer.alloc(vector.length * 4);
        for (let i = 0; i < vector.length; i++) {
            buffer.writeFloatLE(vector[i], i * 4);
        }
        return CortexCrypto.sha256(buffer);
    }
}
