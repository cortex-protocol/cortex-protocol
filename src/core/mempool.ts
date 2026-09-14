import { Transaction, TransactionType } from './transaction';

export class Mempool {
    public static readonly MAX_MEMPOOL_SIZE = 5000;
    private transactions: Map<string, Transaction> = new Map();
    private minFeeTxId: string | null = null;
    private minFeeValue: number = Infinity;

    private balanceProvider?: (address: string) => number;
    private nonceProvider?: (address: string) => number;

    /**
     * Set state balance provider callback
     */
    public setBalanceProvider(provider: (address: string) => number): void {
        this.balanceProvider = provider;
    }

    /**
     * Set state confirmed nonce provider callback
     */
    public setNonceProvider(provider: (address: string) => number): void {
        this.nonceProvider = provider;
    }

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
     * Add a verified transaction to the mempool with DoS protection, nonce checking & O(1) fee-priority eviction
     */
    public addTransaction(
        tx: Transaction,
        balanceProvider?: (address: string) => number,
        nonceProvider?: (address: string) => number
    ): { success: boolean; error?: string } {
        if (!tx.isValid()) {
            return { success: false, error: 'Cryptographic signature or transaction fields are invalid.' };
        }

        const balProv = balanceProvider || this.balanceProvider;
        if (balProv && tx.type !== 'COINBASE') {
            const senderBal = balProv(tx.sender);
            const totalRequired = tx.amount + tx.fee + (tx.burnAmount || 0);
            if (senderBal < totalRequired) {
                return { success: false, error: `Insufficient balance for transaction. Required: ${totalRequired}, Available: ${senderBal}` };
            }
        }

        const nonProv = nonceProvider || this.nonceProvider;
        if (nonProv && tx.type !== 'COINBASE' && tx.sender) {
            const confirmedNonce = nonProv(tx.sender);
            if (tx.nonce <= confirmedNonce) {
                return { 
                    success: false, 
                    error: `Stale nonce: ${tx.nonce}. Confirmed on-chain nonce is ${confirmedNonce}. Nonce must be strictly greater than confirmed nonce.` 
                };
            }
        }

        if (this.transactions.has(tx.id)) {
            return { success: false, error: 'Transaction already exists in mempool.' };
        }

        // Check for duplicate nonce from the same sender in mempool (Replace-By-Fee / duplicate guard)
        if (tx.type !== 'COINBASE' && tx.sender) {
            for (const existingTx of this.transactions.values()) {
                if (existingTx.sender === tx.sender && existingTx.nonce === tx.nonce) {
                    if (tx.fee > existingTx.fee) {
                        // Higher fee replaces previous pending transaction with same nonce
                        this.transactions.delete(existingTx.id);
                        if (existingTx.id === this.minFeeTxId) {
                            this.recomputeMinFee();
                        }
                        break;
                    } else {
                        return {
                            success: false,
                            error: `Transaction with nonce ${tx.nonce} already exists in mempool with equal or higher fee (${existingTx.fee} >= ${tx.fee}).`
                        };
                    }
                }
            }
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
     * Purge transactions whose nonce has been confirmed or exceeded on-chain
     */
    public purgeStaleTransactions(nonceProvider?: (address: string) => number): number {
        const nonProv = nonceProvider || this.nonceProvider;
        if (!nonProv) return 0;

        const staleTxs: Transaction[] = [];
        for (const tx of this.transactions.values()) {
            if (tx.type !== 'COINBASE' && tx.sender) {
                const confirmedNonce = nonProv(tx.sender);
                if (tx.nonce <= confirmedNonce) {
                    staleTxs.push(tx);
                }
            }
        }

        if (staleTxs.length > 0) {
            this.removeTransactions(staleTxs);
        }
        return staleTxs.length;
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
     * Strictly filters out stale nonces (<= on-chain confirmed nonce) and orders
     * transactions from each sender in ascending nonce order (nonce ASC) to
     * prevent block rejection and network-wide mining freezes.
     */
    public getCandidateTransactions(
        maxLimit = 500,
        nonceProvider?: (address: string) => number
    ): Transaction[] {
        const nonProv = nonceProvider || this.nonceProvider;

        // 1. Purge stale transactions if nonceProvider is available
        if (nonProv) {
            this.purgeStaleTransactions(nonProv);
        }

        // 2. Group mempool transactions by sender
        const bySender = new Map<string, Transaction[]>();
        for (const tx of this.transactions.values()) {
            const sender = tx.sender || 'UNKNOWN';
            if (!bySender.has(sender)) {
                bySender.set(sender, []);
            }
            bySender.get(sender)!.push(tx);
        }

        // 3. For each sender, deduplicate and sort by nonce ASC
        const senderQueues = new Map<string, Transaction[]>();
        for (const [sender, txs] of bySender.entries()) {
            const nonceMap = new Map<number, Transaction>();
            for (const tx of txs) {
                const existing = nonceMap.get(tx.nonce);
                if (!existing || tx.fee > existing.fee) {
                    nonceMap.set(tx.nonce, tx);
                }
            }
            const sorted = Array.from(nonceMap.values()).sort((a, b) => a.nonce - b.nonce);
            if (sorted.length > 0) {
                senderQueues.set(sender, sorted);
            }
        }

        // 4. Multi-queue greedy selection: pick highest-fee available transaction head across senders
        const candidates: Transaction[] = [];
        while (candidates.length < maxLimit && senderQueues.size > 0) {
            let bestSender: string | null = null;
            let bestFee = -Infinity;

            for (const [sender, queue] of senderQueues.entries()) {
                const head = queue[0];
                if (head.fee > bestFee) {
                    bestFee = head.fee;
                    bestSender = sender;
                }
            }

            if (!bestSender) break;

            const queue = senderQueues.get(bestSender)!;
            const tx = queue.shift()!;
            candidates.push(tx);

            if (queue.length === 0) {
                senderQueues.delete(bestSender);
            }
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
