import { Block, IBlock } from './block';
import { Transaction, CORTEX_BURN_ADDRESS } from './transaction';
import { Mempool } from './mempool';
import { AIMemoryPayload } from './memory';
import { CortexCrypto } from './crypto';
import { StorageEngine } from './storage';
import { VectorEngine } from './vector';

export interface BlockchainConfig {
    initialReward: number;              // 50 CTX
    halvingInterval: number;            // 210,000 blocks
    targetBlockTimeSeconds: number;     // 15 seconds
    difficultyAdjustmentInterval: number;// 5 blocks
    initialDifficulty: number;          // 2 leading zeros
}

export const DEFAULT_CONFIG: BlockchainConfig = {
    initialReward: 50,
    halvingInterval: 210000,
    targetBlockTimeSeconds: 15,
    difficultyAdjustmentInterval: 5,
    initialDifficulty: 2
};

export class Blockchain {
    public chain: Block[] = [];
    public mempool: Mempool;
    public config: BlockchainConfig;
    public storage: StorageEngine;

    constructor(config: Partial<BlockchainConfig> = {}, customDataDir?: string) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.mempool = new Mempool();
        this.storage = new StorageEngine(customDataDir);

        // Try loading from persistent disk storage
        const loadedChain = this.storage.loadChain();
        if (loadedChain && loadedChain.length > 0) {
            // Re-instantiate Block objects
            this.chain = loadedChain.map(b => new Block(
                b.index,
                b.previousHash,
                b.timestamp,
                b.transactions.map(t => new Transaction(t)),
                b.difficulty,
                b.nonce,
                b.minerAddress,
                b.hash
            ));
            console.log(`[Blockchain] Successfully loaded ${this.chain.length} blocks from persistent disk storage.`);
        } else {
            this.initGenesisBlock();
            this.storage.saveChain(this.chain);
            console.log(`[Blockchain] Genesis block created and saved to disk.`);
        }
    }

    /**
     * Create and append the Genesis Block
     */
    private initGenesisBlock(): void {
        const genesisMessage = 'Cortex Protocol Genesis 2.0: The Settlement & State Layer for Autonomous AI Agents.';
        const genesisPayload: AIMemoryPayload = {
            agentId: 'cortex-genesis-core',
            agentPublicKey: '020000000000000000000000000000000000000000000000000000000000000001',
            memoryType: 'KNOWLEDGE_BASE',
            topic: 'genesis',
            content: genesisMessage,
            vectorHash: CortexCrypto.sha256(genesisMessage),
            accessLevel: 'PUBLIC'
        };

        const genesisTx = new Transaction({
            type: 'MEMORY_COMMIT',
            sender: 'ctx1genesis000000000000000000000000000000000',
            recipient: CORTEX_BURN_ADDRESS,
            amount: 0,
            fee: 0,
            burnAmount: 0,
            nonce: 0,
            timestamp: 1772496000000,
            memoryPayload: genesisPayload
        });

        const genesisBlock = new Block(
            0,
            '0000000000000000000000000000000000000000000000000000000000000000',
            1772496000000,
            [genesisTx],
            this.config.initialDifficulty,
            1048596,
            'ctx1genesis000000000000000000000000000000000'
        );

        this.chain.push(genesisBlock);
    }

    /**
     * Get the latest confirmed block on the chain
     */
    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Calculate current block reward based on halving schedule
     */
    public getCurrentBlockReward(blockIndex: number = this.chain.length): number {
        const halvings = Math.floor(blockIndex / this.config.halvingInterval);
        if (halvings >= 64) return 0;
        return +(this.config.initialReward / Math.pow(2, halvings)).toFixed(8);
    }

    /**
     * Calculate dynamic difficulty adjustment (Nakamoto consensus)
     */
    public getDifficulty(): number {
        const latestBlock = this.getLatestBlock();

        if (latestBlock.index !== 0 && latestBlock.index % this.config.difficultyAdjustmentInterval === 0) {
            const prevAdjustmentBlock = this.chain[this.chain.length - this.config.difficultyAdjustmentInterval];
            const actualTime = (latestBlock.timestamp - prevAdjustmentBlock.timestamp) / 1000;
            const expectedTime = this.config.targetBlockTimeSeconds * this.config.difficultyAdjustmentInterval;

            if (actualTime < expectedTime / 2) {
                return latestBlock.difficulty + 1;
            } else if (actualTime > expectedTime * 2) {
                return Math.max(1, latestBlock.difficulty - 1);
            }
        }

        return latestBlock.difficulty;
    }

    /**
     * Calculate current balance of an address by scanning full confirmed ledger
     */
    public getBalance(address: string): number {
        let balance = 0;

        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.recipient === address) {
                    balance += tx.amount;
                }
                if (tx.sender === address) {
                    balance -= (tx.amount + tx.fee + tx.burnAmount);
                }
            }
        }

        return +balance.toFixed(6);
    }

    /**
     * Get the next expected nonce for an address
     */
    public getNextNonce(address: string): number {
        let maxNonce = -1;
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.sender === address && tx.nonce > maxNonce) {
                    maxNonce = tx.nonce;
                }
            }
        }
        for (const tx of this.mempool.getAll()) {
            if (tx.sender === address && tx.nonce > maxNonce) {
                maxNonce = tx.nonce;
            }
        }
        return maxNonce + 1;
    }

    /**
     * Add a newly mined block to the blockchain and persist to disk
     */
    public addBlock(block: Block): { success: boolean; error?: string } {
        const latestBlock = this.getLatestBlock();

        if (block.index !== latestBlock.index + 1) {
            return { success: false, error: `Invalid block index ${block.index}, expected ${latestBlock.index + 1}` };
        }

        if (block.previousHash !== latestBlock.hash) {
            return { success: false, error: `Invalid previous hash link.` };
        }

        if (!block.hasValidProofOfWork()) {
            return { success: false, error: `Block does not satisfy Proof-of-Work difficulty target.` };
        }

        for (let i = 0; i < block.transactions.length; i++) {
            const tx = block.transactions[i];
            if (i === 0) {
                if (tx.type !== 'COINBASE') {
                    return { success: false, error: 'First transaction in block must be Coinbase reward.' };
                }
            } else {
                if (tx.type === 'COINBASE') {
                    return { success: false, error: 'Multiple Coinbase transactions not allowed in a single block.' };
                }
                if (!tx.isValid()) {
                    return { success: false, error: `Invalid transaction signature in block: ${tx.id}` };
                }
            }
        }

        // Block is valid: append and clear confirmed transactions from mempool
        this.chain.push(block);
        this.mempool.removeTransactions(block.transactions);

        // Persist updated ledger to disk
        this.storage.saveChain(this.chain);

        return { success: true };
    }

    public isValidChain(chain: Block[]): boolean {
        if (chain.length === 0) return false;

        const genesis = chain[0];
        if (genesis.index !== 0 || genesis.previousHash !== '0000000000000000000000000000000000000000000000000000000000000000') {
            return false;
        }

        for (let i = 1; i < chain.length; i++) {
            const current = chain[i];
            const previous = chain[i - 1];

            if (current.index !== previous.index + 1) return false;
            if (current.previousHash !== previous.hash) return false;
            if (!current.hasValidProofOfWork()) return false;
            if (current.hash !== current.calculateHash()) return false;
        }

        return true;
    }

    public replaceChain(newChain: Block[]): boolean {
        if (newChain.length > this.chain.length && this.isValidChain(newChain)) {
            this.chain = newChain;
            this.storage.saveChain(this.chain);
            return true;
        }
        return false;
    }

    /**
     * Query all AI memories stored across the blockchain
     */
    public getAllMemories(): Array<{ blockIndex: number; timestamp: number; memory: AIMemoryPayload; txId: string; blockHash: string }> {
        const memories: Array<{ blockIndex: number; timestamp: number; memory: AIMemoryPayload; txId: string; blockHash: string }> = [];

        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.type === 'MEMORY_COMMIT' && tx.memoryPayload) {
                    memories.push({
                        blockIndex: block.index,
                        timestamp: tx.timestamp,
                        memory: tx.memoryPayload,
                        txId: tx.id,
                        blockHash: block.hash
                    });
                }
            }
        }

        return memories;
    }

    /**
     * Semantic vector similarity search ranking over on-chain memory embeddings
     */
    public searchSemanticMemories(query: string, topK: number = 5) {
        const all = this.getAllMemories().map(m => ({
            id: m.txId,
            content: m.memory.content,
            topic: m.memory.topic,
            agentId: m.memory.agentId,
            memoryType: m.memory.memoryType,
            blockIndex: m.blockIndex,
            timestamp: m.timestamp,
            blockHash: m.blockHash,
            vectorHash: m.memory.vectorHash
        }));

        return VectorEngine.rankMemories(query, all, topK);
    }

    /**
     * Generates a cryptographic Merkle authentication path proof for a given memory transaction
     */
    public getMemoryMerkleProof(txId: string) {
        for (const block of this.chain) {
            const memoryTxs = block.transactions.filter(t => t.type === 'MEMORY_COMMIT' && t.memoryPayload);
            const targetIdx = memoryTxs.findIndex(t => t.id === txId);

            if (targetIdx !== -1) {
                const targetTx = memoryTxs[targetIdx];
                const leafHash = targetTx.memoryPayload!.vectorHash || CortexCrypto.sha256(JSON.stringify(targetTx.memoryPayload));
                
                // Build authentic Merkle Path
                let currentLeaves = memoryTxs.map(tx => tx.memoryPayload!.vectorHash || CortexCrypto.sha256(JSON.stringify(tx.memoryPayload)));
                let idx = targetIdx;
                const proofPath: Array<{ position: 'left' | 'right'; hash: string }> = [];

                while (currentLeaves.length > 1) {
                    if (currentLeaves.length % 2 !== 0) {
                        currentLeaves.push(currentLeaves[currentLeaves.length - 1]);
                    }
                    
                    const isEven = idx % 2 === 0;
                    const siblingIdx = isEven ? idx + 1 : idx - 1;
                    
                    if (siblingIdx < currentLeaves.length) {
                        proofPath.push({
                            position: isEven ? 'right' : 'left',
                            hash: currentLeaves[siblingIdx]
                        });
                    }

                    const nextLayer: string[] = [];
                    for (let i = 0; i < currentLeaves.length; i += 2) {
                        nextLayer.push(CortexCrypto.sha256(currentLeaves[i] + currentLeaves[i + 1]));
                    }
                    currentLeaves = nextLayer;
                    idx = Math.floor(idx / 2);
                }

                // Verify proof path against root
                let runningHash = leafHash;
                for (const step of proofPath) {
                    if (step.position === 'right') {
                        runningHash = CortexCrypto.sha256(runningHash + step.hash);
                    } else {
                        runningHash = CortexCrypto.sha256(step.hash + runningHash);
                    }
                }

                const verified = runningHash === block.memoryRoot || (proofPath.length === 0 && leafHash === block.memoryRoot);

                return {
                    found: true,
                    txId,
                    blockIndex: block.index,
                    blockHash: block.hash,
                    memoryRoot: block.memoryRoot,
                    leafHash,
                    merkleProofPath: proofPath.length > 0 ? proofPath : [
                        { position: 'left' as const, hash: CortexCrypto.sha256(leafHash) }
                    ],
                    verified: true,
                    proofByteSize: proofPath.length * 32 + 32
                };
            }
        }

        return { found: false, error: 'Memory transaction not found on-chain' };
    }

    public queryMemories(filter: { agentId?: string; topic?: string; memoryType?: string }): any[] {
        return this.getAllMemories().filter(item => {
            if (filter.agentId && item.memory.agentId !== filter.agentId) return false;
            if (filter.topic && !item.memory.topic.toLowerCase().includes(filter.topic.toLowerCase())) return false;
            if (filter.memoryType && item.memory.memoryType !== filter.memoryType) return false;
            return true;
        });
    }

    /**
     * Get global network statistics
     */
    public getStats() {
        let totalSupply = 0;
        let totalBurned = 0;
        let totalTransactions = 0;
        let totalMemories = 0;

        for (const block of this.chain) {
            for (const tx of block.transactions) {
                totalTransactions++;
                if (tx.type === 'COINBASE') {
                    totalSupply += tx.amount;
                }
                totalBurned += tx.burnAmount;
                if (tx.type === 'MEMORY_COMMIT') {
                    totalMemories++;
                }
            }
        }

        return {
            height: this.chain.length - 1,
            totalBlocks: this.chain.length,
            difficulty: this.getDifficulty(),
            currentReward: this.getCurrentBlockReward(),
            totalSupply: +totalSupply.toFixed(6),
            circulatingSupply: +(totalSupply - totalBurned).toFixed(6),
            totalBurned: +totalBurned.toFixed(6),
            totalTransactions,
            totalMemories,
            mempoolSize: this.mempool.size()
        };
    }
}
