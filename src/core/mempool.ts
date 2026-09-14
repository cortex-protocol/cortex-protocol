import { Transaction, TransactionType } from './transaction';

export class Mempool {
    public static readonly MAX_MEMPOOL_SIZE = 5000;
    private transactions: Map<string, Transaction> = new Map();
    private minFeeTxId: string | null = null;
    private minFeeValue: number = Infinity;

    /**
     * Recalculate the transaction with the lowest fee in the mempool
     */
    private recomputeMinFee(): void {
        this.minFeeTxId = null;
        this.minFeeValue = Infinity;
        for (const [id, tx] of this.transactions.entries()) {
            if (tx.fee < this.minFeeValue) {
                this.minFeeValue = tx.fee;
                this.minFeeTxId = id;
            }
        }
    }

    /**
     * Add a verified transaction to the mempool with DoS protection & O(1) fee-priority eviction
     */
    public addTransaction(
        tx: Transaction,
        balanceProvider?: (address: string) => number,
        nonceProvider?: (address: string) => number
    ): { success: boolean; error?: string } {
        if (!tx.isValid()) {
            return { success: false, error: 'Cryptographic signature or transaction fields are invalid.' };
        }

        if (tx.type !== 'COINBASE') {
            if (nonceProvider) {
                const confirmedNonce = nonceProvider(tx.sender);
                if (tx.nonce <= confirmedNonce) {
                    return { 
                        success: false, 
                        error: `Invalid nonce: ${tx.nonce}. Must be strictly greater than confirmed nonce ${confirmedNonce}.` 
                    };
                }
            }

            if (balanceProvider) {
                const senderBal = balanceProvider(tx.sender);
                const totalRequired = tx.amount + tx.fee + (tx.burnAmount || 0);
                if (senderBal < totalRequired) {
                    return { success: false, error: `Insufficient balance for transaction. Required: ${totalRequired}, Available: ${senderBal}` };
                }
            }
        }

        if (this.transactions.has(tx.id)) {
            return { success: false, error: 'Transaction already exists in mempool.' };
        }

        // Mempool capacity check & O(1) tracked fee-priority eviction
        if (this.transactions.size >= Mempool.MAX_MEMPOOL_SIZE) {
            if (!this.minFeeTxId || !this.transactions.has(this.minFeeTxId)) {
                this.recomputeMinFee();
            }

            if (this.minFeeTxId && tx.fee > this.minFeeValue) {
                this.transactions.delete(this.minFeeTxId);
                this.recomputeMinFee();
            } else {
                return { success: false, error: 'Mempool is full and transaction fee is too low for eviction.' };
            }
        }

        this.transactions.set(tx.id, tx);
        if (tx.fee < this.minFeeValue) {
            this.minFeeValue = tx.fee;
            this.minFeeTxId = tx.id;
        }

        return { success: true };
    }

    /**
     * Get transaction by ID
     */
    public getTransaction(txId: string): Transaction | undefined {
        return this.transactions.get(txId);
    }

    /**
     * Get all pending transactions sorted by fee descending (miner priority)
     */
    public getAll(): Transaction[] {
        return Array.from(this.transactions.values()).sort((a, b) => b.fee - a.fee);
    }

    /**
     * Get candidate transactions to include in the next block (up to maxTxLimit).
     * Filters out stale nonces and guarantees strictly ascending nonce order per sender.
     */
    public getCandidateTransactions(
        maxLimit = 500,
        nonceProvider?: (address: string) => number
    ): Transaction[] {
        let txs = this.getAll();

        // 1. Filter out stale nonces if nonceProvider is provided
        if (nonceProvider) {
            txs = txs.filter(tx => {
                if (tx.type === 'COINBASE' || !tx.sender) return true;
                return tx.nonce > nonceProvider(tx.sender);
            });
        }

        // 2. Group transactions by sender to preserve sequential nonce order
        const bySender = new Map<string, Transaction[]>();
        for (const tx of txs) {
            if (!bySender.has(tx.sender)) {
                bySender.set(tx.sender, []);
            }
            bySender.get(tx.sender)!.push(tx);
        }

        // 3. For each sender, sort by nonce ascending (strict sequential order)
        for (const senderTxs of bySender.values()) {
            senderTxs.sort((a, b) => a.nonce - b.nonce);
        }

        // 4. Greedily pick candidate transactions respecting fee priority while strictly maintaining nonce order
        const candidates: Transaction[] = [];
        const senderOffsets = new Map<string, number>();

        while (candidates.length < maxLimit) {
            let bestSender: string | null = null;
            let bestFee = -1;

            for (const [sender, list] of bySender.entries()) {
                const offset = senderOffsets.get(sender) || 0;
                if (offset < list.length) {
                    const nextTx = list[offset];
                    if (nextTx.fee > bestFee) {
                        bestFee = nextTx.fee;
                        bestSender = sender;
                    }
                }
            }

            if (!bestSender) break;

            const offset = senderOffsets.get(bestSender) || 0;
            candidates.push(bySender.get(bestSender)![offset]);
            senderOffsets.set(bestSender, offset + 1);
        }

        return candidates;
    }

    /**
     * Remove transactions that were successfully mined into a block
     */
    public removeTransactions(txs: Transaction[]): void {
        let removedMin = false;
        for (const tx of txs) {
            if (tx.id === this.minFeeTxId) {
                removedMin = true;
            }
            this.transactions.delete(tx.id);
        }
        if (removedMin) {
            this.recomputeMinFee();
        }
    }

    /**
     * Get number of pending transactions
     */
    public size(): number {
        return this.transactions.size;
    }

    /**
     * Clear all pending transactions
     */
    public clear(): void {
        this.transactions.clear();
        this.minFeeTxId = null;
        this.minFeeValue = Infinity;
    }
}
