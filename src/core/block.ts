import { CortexCrypto } from './crypto';
import { CortexRandomX } from './randomx';
import { Transaction } from './transaction';

export interface IBlock {
    index: number;
    previousHash: string;
    timestamp: number;
    merkleRoot: string;
    memoryRoot: string;
    difficulty: number;
    nonce: number;
    minerAddress: string;
    hash: string;
    transactions: Transaction[];
}

export class Block implements IBlock {
    public index: number;
    public previousHash: string;
    public timestamp: number;
    public merkleRoot: string;
    public memoryRoot: string;
    public difficulty: number;
    public nonce: number;
    public minerAddress: string;
    public hash: string;
    public transactions: Transaction[];

    constructor(
        index: number,
        previousHash: string,
        timestamp: number,
        transactions: Transaction[],
        difficulty: number,
        nonce = 0,
        minerAddress = '',
        hash = ''
    ) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions.map(tx => tx instanceof Transaction ? tx : new Transaction(tx));
        this.difficulty = difficulty;
        this.nonce = nonce;
        this.minerAddress = minerAddress;
        
        this.merkleRoot = this.calculateMerkleRoot();
        this.memoryRoot = this.calculateMemoryRoot();
        this.hash = hash || this.calculateHash();
    }

    /**
     * Compute RandomX CPU hash of block header
     */
    public calculateHash(): string {
        const header = `${this.index}:${this.previousHash}:${this.timestamp}:${this.merkleRoot}:${this.memoryRoot}:${this.difficulty}:${this.nonce}:${this.minerAddress}`;
        const seed = CortexRandomX.getSeedForBlock(this.index);
        return CortexRandomX.hash(header, seed);
    }

    /**
     * Calculate Merkle Root of all transactions in block
     */
    public calculateMerkleRoot(): string {
        if (this.transactions.length === 0) {
            return CortexCrypto.sha256('EMPTY_TX_ROOT');
        }

        let currentLayer = this.transactions.map(tx => tx.id || tx.calculateHash());

        while (currentLayer.length > 1) {
            if (currentLayer.length % 2 !== 0) {
                currentLayer.push(currentLayer[currentLayer.length - 1]); // Duplicate last hash if odd
            }

            const nextLayer: string[] = [];
            for (let i = 0; i < currentLayer.length; i += 2) {
                const combined = CortexCrypto.sha256(currentLayer[i] + currentLayer[i + 1]);
                nextLayer.push(combined);
            }
            currentLayer = nextLayer;
        }

        return currentLayer[0];
    }

    /**
     * Calculate Memory Root of all AI memories stored in this block
     */
    public calculateMemoryRoot(): string {
        const memoryHashes = this.transactions
            .filter(tx => tx.type === 'MEMORY_COMMIT' && tx.memoryPayload)
            .map(tx => tx.memoryPayload!.vectorHash || CortexCrypto.sha256(JSON.stringify(tx.memoryPayload)));

        if (memoryHashes.length === 0) {
            return CortexCrypto.sha256('NO_MEMORY_COMMITS');
        }

        let currentLayer = [...memoryHashes];
        while (currentLayer.length > 1) {
            if (currentLayer.length % 2 !== 0) {
                currentLayer.push(currentLayer[currentLayer.length - 1]);
            }
            const nextLayer: string[] = [];
            for (let i = 0; i < currentLayer.length; i += 2) {
                nextLayer.push(CortexCrypto.sha256(currentLayer[i] + currentLayer[i + 1]));
            }
            currentLayer = nextLayer;
        }

        return currentLayer[0];
    }

    /**
     * Verify if the block's hash satisfies the Proof-of-Work difficulty target
     */
    public hasValidProofOfWork(): boolean {
        const prefix = '0'.repeat(this.difficulty);
        return this.hash.startsWith(prefix) && this.hash === this.calculateHash();
    }
}
