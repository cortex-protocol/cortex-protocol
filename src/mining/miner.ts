import { Blockchain } from '../core/blockchain';
import { Block } from '../core/block';
import { Transaction } from '../core/transaction';
import { CortexCrypto } from '../core/crypto';
import { CortexRandomX } from '../core/randomx';

export interface MiningStats {
    isMining: boolean;
    hashrate: number;         // Hashes per second
    totalHashes: number;
    blocksFound: number;
    currentBlockIndex: number;
    currentDifficulty: number;
    minerAddress: string;
    lastBlockTimeMs: number;
}

export class CortexMiner {
    private blockchain: Blockchain;
    private minerAddress: string;
    private isMining: boolean = false;
    private totalHashes: number = 0;
    private blocksFound: number = 0;
    private currentHashrate: number = 0;
    private lastBlockTimeMs: number = 0;
    private onBlockFoundCallback?: (block: Block) => void;

    constructor(blockchain: Blockchain, minerAddress: string) {
        this.blockchain = blockchain;
        this.minerAddress = minerAddress;
    }

    public setMinerAddress(address: string): void {
        this.minerAddress = address;
    }

    public getMinerAddress(): string {
        return this.minerAddress;
    }

    public onBlockFound(callback: (block: Block) => void): void {
        this.onBlockFoundCallback = callback;
    }

    /**
     * Mine a single block iteratively without blocking the main event loop
     */
    public async mineNextBlockAsync(maxIterations: number = 500000): Promise<{ success: boolean; block?: Block; hashesChecked: number; timeTakenMs: number }> {
        const startTime = Date.now();
        const latestBlock = this.blockchain.getLatestBlock();
        const nextIndex = latestBlock.index + 1;
        const difficulty = this.blockchain.getDifficulty();
        const reward = this.blockchain.getCurrentBlockReward(nextIndex);

        // Fetch candidate transactions from mempool
        const candidateTxs = this.blockchain.mempool.getCandidateTransactions();
        const totalFees = candidateTxs.reduce((sum, tx) => sum + tx.fee, 0);

        // Build Coinbase transaction
        const coinbaseTx = Transaction.createCoinbase(this.minerAddress, reward, totalFees);
        const blockTransactions = [coinbaseTx, ...candidateTxs];

        const targetPrefix = '0'.repeat(difficulty);
        let nonce = Math.floor(Math.random() * 100000);
        let hashes = 0;
        const timestamp = Date.now();

        const block = new Block(
            nextIndex,
            latestBlock.hash,
            timestamp,
            blockTransactions,
            difficulty,
            0,
            this.minerAddress
        );

        const headerPrefix = `${block.index}:${block.previousHash}:${block.timestamp}:${block.merkleRoot}:${block.memoryRoot}:${block.difficulty}:`;
        const headerSuffix = `:${block.minerAddress}`;
        const seed = CortexRandomX.getSeedForBlock(nextIndex);

        const CHUNK_SIZE = 50;

        while (hashes < maxIterations) {
            // Run a small chunk of hashes
            const chunkLimit = Math.min(CHUNK_SIZE, maxIterations - hashes);
            for (let i = 0; i < chunkLimit; i++) {
                const header = `${headerPrefix}${nonce}${headerSuffix}`;
                const hash = CortexRandomX.hash(header, seed);
                hashes++;
                this.totalHashes++;

                if (hash.startsWith(targetPrefix)) {
                    block.nonce = nonce;
                    block.hash = hash;

                    const timeTaken = Date.now() - startTime;
                    this.blocksFound++;
                    this.lastBlockTimeMs = timeTaken;

                    const res = this.blockchain.addBlock(block);
                    if (res.success) {
                        if (this.onBlockFoundCallback) {
                            this.onBlockFoundCallback(block);
                        }
                        return { success: true, block, hashesChecked: hashes, timeTakenMs: timeTaken };
                    }
                }
                nonce++;
            }

            // Yield control back to Node.js event loop so HTTP requests never stall
            await new Promise(resolve => setTimeout(resolve, 8));
        }

        const timeTaken = Date.now() - startTime;
        return { success: false, hashesChecked: hashes, timeTakenMs: timeTaken };
    }

    /**
     * Start continuous non-blocking background mining loop
     */
    public startContinuousMining(onTick?: (stats: MiningStats) => void): void {
        if (this.isMining) return;
        this.isMining = true;

        let lastTime = Date.now();
        let lastHashCount = this.totalHashes;

        const miningLoop = async () => {
            if (!this.isMining) return;

            await this.mineNextBlockAsync(50000);

            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed >= 1.0) {
                const hashesDone = this.totalHashes - lastHashCount;
                this.currentHashrate = Math.round(hashesDone / elapsed);
                lastTime = now;
                lastHashCount = this.totalHashes;

                if (onTick) {
                    onTick(this.getStats());
                }
            }

            // Schedule next iteration
            if (this.isMining) {
                setImmediate(miningLoop);
            }
        };

        miningLoop();
    }

    /**
     * Stop continuous mining
     */
    public stopMining(): void {
        this.isMining = false;
        this.currentHashrate = 0;
    }

    /**
     * Get current live mining statistics
     */
    public getStats(): MiningStats {
        return {
            isMining: this.isMining,
            hashrate: this.currentHashrate,
            totalHashes: this.totalHashes,
            blocksFound: this.blocksFound,
            currentBlockIndex: this.blockchain.getLatestBlock().index,
            currentDifficulty: this.blockchain.getDifficulty(),
            minerAddress: this.minerAddress,
            lastBlockTimeMs: this.lastBlockTimeMs
        };
    }
}
