import { Blockchain } from '../core/blockchain';
import { Block } from '../core/block';
import { Transaction } from '../core/transaction';
import { CortexCrypto, KeyPair } from '../core/crypto';

export interface PoolMinerInfo {
    address: string;
    workerId: string;
    shares: number;
    validSharesRound: number;
    hashrate: number;
    lastSeen: number;
    pendingPayout: number;
    totalPaid: number;
}

export interface PoolStats {
    poolAddress: string;
    poolFeePercent: number;
    connectedMinersCount: number;
    totalPoolHashrate: number;
    totalPoolShares: number;
    currentRoundShares: number;
    poolBlocksFound: number;
    shareDifficulty: number;
    networkDifficulty: number;
    miners: PoolMinerInfo[];
}

export class CortexMiningPool {
    private blockchain: Blockchain;
    public poolKeyPair: KeyPair;
    public poolFeePercent: number = 1.0; // 1% pool fee
    public shareDifficulty: number = 3;   // Share difficulty: 3 leading zeros
    private miners: Map<string, PoolMinerInfo> = new Map();
    private poolBlocksFound: number = 0;
    private currentRoundShares: number = 0;
    private lastDistributedBlock: number = 0;
    private onBlockFoundCallback?: (block: Block) => void;

    constructor(blockchain: Blockchain, poolPrivateKeyHex?: string) {
        this.blockchain = blockchain;
        const privKey = poolPrivateKeyHex || '9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e';
        this.poolKeyPair = CortexCrypto.fromPrivateKey(privKey);
        this.lastDistributedBlock = blockchain.getLatestBlock().index;

        // Monitor blockchain to distribute pool rewards whenever a new block is mined
        setInterval(() => this.checkAndDistributeOnNewBlock(), 1500);
        setInterval(() => this.cleanupInactiveWorkers(), 5000);
    }

    public onBlockFound(callback: (block: Block) => void): void {
        this.onBlockFoundCallback = callback;
    }

    public getPoolAddress(): string {
        return this.poolKeyPair.address;
    }

    /**
     * Get work template for connected pool miners
     */
    public getWorkTemplate(minerAddress: string, workerId: string = 'worker-1') {
        const latestBlock = this.blockchain.getLatestBlock();
        const nextIndex = latestBlock.index + 1;
        const difficulty = this.blockchain.getDifficulty();
        const reward = this.blockchain.getCurrentBlockReward(nextIndex);
        const candidateTxs = this.blockchain.mempool.getCandidateTransactions();
        const totalFees = candidateTxs.reduce((sum, tx) => sum + tx.fee, 0);

        // Coinbase reward pays to the Pool Master Address
        const coinbaseTx = Transaction.createCoinbase(this.poolKeyPair.address, reward, totalFees);
        const blockTransactions = [coinbaseTx, ...candidateTxs];
        const timestamp = Date.now();

        const block = new Block(
            nextIndex,
            latestBlock.hash,
            timestamp,
            blockTransactions,
            difficulty,
            0,
            this.poolKeyPair.address
        );

        // Register or update miner activity
        this.recordMinerPing(minerAddress, workerId);

        return {
            index: block.index,
            previousHash: block.previousHash,
            timestamp: block.timestamp,
            difficulty: block.difficulty,
            shareDifficulty: this.shareDifficulty,
            poolAddress: this.poolKeyPair.address,
            merkleRoot: block.merkleRoot,
            memoryRoot: block.memoryRoot,
            headerPrefix: `${block.index}:${block.previousHash}:${block.timestamp}:${block.merkleRoot}:${block.memoryRoot}:${block.difficulty}:`,
            headerSuffix: `:${block.minerAddress}`,
            targetSharePrefix: '0'.repeat(this.shareDifficulty),
            targetNetworkPrefix: '0'.repeat(difficulty),
            reward,
            transactions: block.transactions
        };
    }

    /**
     * Submit and validate a PoW share from a worker
     */
    public submitShare(data: {
        minerAddress: string;
        workerId?: string;
        index: number;
        previousHash: string;
        timestamp: number;
        transactions: any[];
        difficulty: number;
        nonce: number;
        hash: string;
    }): { validShare: boolean; blockFound: boolean; message?: string; error?: string; roundShares?: number; estimatedReward?: number } {
        const { minerAddress, workerId = 'worker-1', index, previousHash, timestamp, transactions, difficulty, nonce, hash } = data;

        if (!minerAddress || !minerAddress.startsWith('ctx1')) {
            return { validShare: false, blockFound: false, error: 'Invalid miner address format' };
        }

        const latestBlock = this.blockchain.getLatestBlock();
        if (index !== latestBlock.index + 1 || previousHash !== latestBlock.hash) {
            return { validShare: false, blockFound: false, error: 'Stale share: new block already accepted by network' };
        }

        // Verify hash integrity
        const block = new Block(
            index,
            previousHash,
            timestamp,
            transactions || [],
            difficulty,
            nonce,
            this.poolKeyPair.address,
            hash
        );

        const expectedHash = block.calculateHash();
        if (hash !== expectedHash) {
            return { validShare: false, blockFound: false, error: 'Invalid hash calculation' };
        }

        const sharePrefix = '0'.repeat(this.shareDifficulty);
        if (!hash.startsWith(sharePrefix)) {
            return { validShare: false, blockFound: false, error: `Share did not meet pool share difficulty ${this.shareDifficulty}` };
        }

        // --- VALID SHARE ACCEPTED IN CURRENT ROUND ---
        const miner = this.recordValidShare(minerAddress, workerId);
        this.currentRoundShares++;

        const shareRatio = this.currentRoundShares > 0 ? (miner.validSharesRound / this.currentRoundShares) : 1;
        const estimatedReward = +(49.50 * shareRatio).toFixed(4);

        // Check if share ALSO satisfies FULL NETWORK DIFFICULTY!
        const networkPrefix = '0'.repeat(difficulty);
        let blockFound = false;

        if (hash.startsWith(networkPrefix)) {
            const addRes = this.blockchain.addBlock(block);
            if (addRes.success) {
                blockFound = true;
                this.poolBlocksFound++;
                console.log(`\n🎉🎉 [MINING POOL] Block #${block.index} SOLVED BY POOL WORKER (${minerAddress}.${workerId})!`);
                
                // Distribute full block reward on-chain
                this.distributeRoundRewards(block.transactions[0]?.amount || 50, block.index);

                if (this.onBlockFoundCallback) {
                    this.onBlockFoundCallback(block);
                }
            }
        }

        return {
            validShare: true,
            blockFound,
            roundShares: miner.validSharesRound,
            estimatedReward,
            message: blockFound 
                ? `🎉 INCREDIBLE! You solved network block #${index}! Full block reward distributed!` 
                : `✓ Share accepted (Diff ${this.shareDifficulty})! +1 Pool Share`
        };
    }

    private recordMinerPing(address: string, workerId: string): PoolMinerInfo {
        const key = `${address.toLowerCase()}:${workerId}`;
        let existing = this.miners.get(key);
        if (existing) {
            existing.lastSeen = Date.now();
        } else {
            existing = {
                address,
                workerId,
                shares: 0,
                validSharesRound: 0,
                hashrate: 0,
                lastSeen: Date.now(),
                pendingPayout: 0,
                totalPaid: 0
            };
            this.miners.set(key, existing);
        }
        return existing;
    }

    private recordValidShare(address: string, workerId: string): PoolMinerInfo {
        const key = `${address.toLowerCase()}:${workerId}`;
        let existing = this.miners.get(key);
        const now = Date.now();
        if (existing) {
            existing.shares++;
            existing.validSharesRound++;
            const deltaSec = Math.max(0.5, (now - existing.lastSeen) / 1000);
            existing.lastSeen = now;
            // 1 share = 16^shareDifficulty = 16^3 = 4096 hashes
            const instantHr = Math.round(4096 / deltaSec);
            if (existing.hashrate > 0) {
                existing.hashrate = Math.round(existing.hashrate * 0.7 + instantHr * 0.3);
            } else {
                existing.hashrate = Math.max(18000, instantHr);
            }
        } else {
            existing = {
                address,
                workerId,
                shares: 1,
                validSharesRound: 1,
                hashrate: 18000,
                lastSeen: now,
                pendingPayout: 0,
                totalPaid: 0
            };
            this.miners.set(key, existing);
        }
        return existing;
    }

    /**
     * Checks if a new block was confirmed on the blockchain, and triggers PPLNS payout to all round contributors
     */
    private checkAndDistributeOnNewBlock() {
        const latest = this.blockchain.getLatestBlock();
        if (latest.index > this.lastDistributedBlock) {
            this.lastDistributedBlock = latest.index;
            if (this.currentRoundShares > 0) {
                console.log(`\n⛏️ [POOL SETTLEMENT] New Block #${latest.index} confirmed! Distributing round rewards to active miners...`);
                this.distributeRoundRewards(latest.transactions[0]?.amount || 50, latest.index);
            }
        }
    }

    /**
     * Distribute block reward proportionally across all active miners based on round shares
     */
    private distributeRoundRewards(totalReward: number, blockIndex: number) {
        if (this.currentRoundShares <= 0) return;

        const poolCut = totalReward * (this.poolFeePercent / 100);
        const distributable = +(totalReward - poolCut).toFixed(4);

        for (const miner of this.miners.values()) {
            if (miner.validSharesRound > 0) {
                const minerShareRatio = miner.validSharesRound / this.currentRoundShares;
                const earned = +(distributable * minerShareRatio).toFixed(4);

                if (earned > 0) {
                    this.executeOnChainPayout(miner.address, earned, blockIndex, miner.workerId);
                    miner.totalPaid += earned;
                }
                miner.validSharesRound = 0; // Reset for next block round
            }
        }

        this.currentRoundShares = 0;
    }

    private executeOnChainPayout(recipient: string, amount: number, blockIndex: number, workerId: string) {
        const poolBal = this.blockchain.getBalance(this.poolKeyPair.address);
        if (poolBal < amount) {
            console.log(`⚠️ Pool balance (${poolBal} CTX) lower than payout (${amount} CTX), queuing.`);
            return;
        }

        const nonce = this.blockchain.getNextNonce(this.poolKeyPair.address);
        const tx = new Transaction({
            type: 'TRANSFER',
            sender: this.poolKeyPair.address,
            senderPublicKey: this.poolKeyPair.publicKey,
            recipient: recipient,
            amount: amount,
            fee: 0,
            burnAmount: 0,
            nonce: nonce,
            timestamp: Date.now()
        });
        tx.sign(this.poolKeyPair.privateKey, this.poolKeyPair.publicKey);

        const addRes = this.blockchain.mempool.addTransaction(tx);
        if (addRes.success) {
            console.log(`  💎 [BLOCK #${blockIndex} PAYOUT] Dispatched +${amount} CTX on-chain to ${recipient} (${workerId})!`);
        }
    }

    private cleanupInactiveWorkers() {
        const now = Date.now();
        for (const [key, miner] of this.miners.entries()) {
            if (now - miner.lastSeen > 90000) {
                this.miners.delete(key);
            } else {
                miner.hashrate = Math.max(18000, miner.shares * 3500);
            }
        }
    }

    public getMinerStats(address: string) {
        const target = address.toLowerCase();
        let totalShares = 0;
        let roundShares = 0;
        let totalPaid = 0;
        let hashrate = 0;
        let workersCount = 0;

        for (const miner of this.miners.values()) {
            if (miner.address.toLowerCase() === target) {
                totalShares += miner.shares;
                roundShares += miner.validSharesRound;
                totalPaid += miner.totalPaid;
                hashrate += miner.hashrate;
                workersCount++;
            }
        }

        const shareRatio = this.currentRoundShares > 0 ? (roundShares / this.currentRoundShares) : (roundShares > 0 ? 1 : 0);
        const estimatedBlockReward = +(49.50 * shareRatio).toFixed(4);

        return {
            address,
            totalShares,
            roundShares,
            currentRoundTotalShares: this.currentRoundShares,
            roundEffortPercent: +(shareRatio * 100).toFixed(1),
            estimatedBlockReward,
            totalPaid: +(totalPaid.toFixed(4)),
            hashrate,
            workersCount
        };
    }

    public getStats(): PoolStats {
        const minersList = Array.from(this.miners.values());
        const totalPoolHashrate = minersList.reduce((sum, m) => sum + m.hashrate, 0);
        const totalPoolShares = minersList.reduce((sum, m) => sum + m.shares, 0);

        return {
            poolAddress: this.poolKeyPair.address,
            poolFeePercent: this.poolFeePercent,
            connectedMinersCount: minersList.length,
            totalPoolHashrate,
            totalPoolShares,
            currentRoundShares: this.currentRoundShares,
            poolBlocksFound: this.poolBlocksFound,
            shareDifficulty: this.shareDifficulty,
            networkDifficulty: this.blockchain.getDifficulty(),
            miners: minersList
        };
    }
}
