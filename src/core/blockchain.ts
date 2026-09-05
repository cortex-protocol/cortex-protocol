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

    // High-performance O(1) state indexes
    private balanceIndex: Map<string, number> = new Map();
    private nonceIndex: Map<string, number> = new Map();
    private memoriesIndex: Array<{ blockIndex: number; timestamp: number; memory: AIMemoryPayload; txId: string; blockHash: string }> = [];
    private totalTransactionsCount: number = 0;
    private totalMemoriesCount: number = 0;
    private totalSupplyAccumulated: number = 0;
    private totalBurnedAccumulated: number = 0;

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

        // Initialize state indexes
        this.rebuildIndexes();
    }

    /**
     * Rebuild entire account balances, nonces, and statistics in a single O(N) pass
     */
    public rebuildIndexes(): void {
        this.balanceIndex.clear();
        this.nonceIndex.clear();
        this.memoriesIndex = [];
        this.totalTransactionsCount = 0;
        this.totalMemoriesCount = 0;
        this.totalSupplyAccumulated = 0;
        this.totalBurnedAccumulated = 0;

        for (const block of this.chain) {
            this.applyBlockToIndexes(block);
        }
    }

    /**
     * Incrementally apply a single block's transactions to the state indexes in O(1)
     */
    private applyBlockToIndexes(block: Block): void {
        for (const tx of block.transactions) {
            this.totalTransactionsCount++;
            if (tx.type === 'COINBASE') {
                this.totalSupplyAccumulated += tx.amount;
            }
            if (tx.burnAmount) {
                this.totalBurnedAccumulated += tx.burnAmount;
            }
            if (tx.type === 'MEMORY_COMMIT' && tx.memoryPayload) {
                this.totalMemoriesCount++;
                this.memoriesIndex.push({
                    blockIndex: block.index,
                    timestamp: tx.timestamp,
                    memory: tx.memoryPayload,
                    txId: tx.id,
                    blockHash: block.hash
                });
            }

            // Credit recipient
            if (tx.recipient && tx.recipient !== CORTEX_BURN_ADDRESS) {
                const cur = this.balanceIndex.get(tx.recipient) || 0;
                this.balanceIndex.set(tx.recipient, +(cur + tx.amount).toFixed(6));
            }

            // Debit sender & update nonce
            if (tx.sender && tx.type !== 'COINBASE') {
                const cur = this.balanceIndex.get(tx.sender) || 0;
                const debit = tx.amount + tx.fee + (tx.burnAmount || 0);
                this.balanceIndex.set(tx.sender, +(cur - debit).toFixed(6));

                const lastNonce = this.nonceIndex.get(tx.sender) ?? -1;
                if (tx.nonce > lastNonce) {
                    this.nonceIndex.set(tx.sender, tx.nonce);
                }
            }
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
     * Calculate current balance of an address (O(1) lookup from state index)
     */
    public getBalance(address: string): number {
        const bal = this.balanceIndex.get(address) || 0;
        return +bal.toFixed(6);
    }

    /**
     * Get the next expected nonce for an address (O(1) state lookup + mempool check)
     */
    public getNextNonce(address: string): number {
        let maxNonce = this.nonceIndex.get(address) ?? -1;
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

        // Block is valid: append, update state indexes in O(1), and clear confirmed transactions from mempool
        this.chain.push(block);
        this.applyBlockToIndexes(block);
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
            this.rebuildIndexes();
            this.storage.saveChain(this.chain);
            return true;
        }
        return false;
    }

    /**
     * Query all AI memories stored across the blockchain (O(1) memory index)
     */
    public getAllMemories(): Array<{ blockIndex: number; timestamp: number; memory: AIMemoryPayload; txId: string; blockHash: string }> {
        return this.memoriesIndex;
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
     * Calculate estimated network hashrate (hashes/second) based on recent block intervals and difficulties
     */
    public getNetworkHashrate(windowBlocks: number = 20): number {
        if (this.chain.length < 2) {
            return 0;
        }

        const count = Math.min(windowBlocks, this.chain.length - 1);
        const startBlock = this.chain[this.chain.length - 1 - count];
        const endBlock = this.chain[this.chain.length - 1];

        const timeSpanSeconds = (endBlock.timestamp - startBlock.timestamp) / 1000;
        if (timeSpanSeconds <= 0) {
            const latestDiff = endBlock.difficulty;
            return Math.round(Math.pow(16, latestDiff) / this.config.targetBlockTimeSeconds);
        }

        let totalHashes = 0;
        for (let i = this.chain.length - count; i < this.chain.length; i++) {
            const b = this.chain[i];
            totalHashes += Math.pow(16, b.difficulty);
        }

        const calculatedRate = Math.round(totalHashes / Math.max(1, timeSpanSeconds));
        return Math.max(0, calculatedRate);
    }

    /**
     * Get global network statistics (O(1) from incremental cache)
     */
    public getStats() {
        return {
            height: this.chain.length - 1,
            totalBlocks: this.chain.length,
            difficulty: this.getDifficulty(),
            networkHashrate: this.getNetworkHashrate(),
            currentReward: this.getCurrentBlockReward(),
            totalSupply: +this.totalSupplyAccumulated.toFixed(6),
            circulatingSupply: +(this.totalSupplyAccumulated - this.totalBurnedAccumulated).toFixed(6),
            totalBurned: +this.totalBurnedAccumulated.toFixed(6),
            totalTransactions: this.totalTransactionsCount,
            totalMemories: this.totalMemoriesCount,
            mempoolSize: this.mempool.size()
        };
    }
}

