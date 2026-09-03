import { Transaction, TransactionType } from './transaction';

export class Mempool {
    private transactions: Map<string, Transaction> = new Map();

    /**
     * Add a verified transaction to the mempool
     */
    public addTransaction(tx: Transaction): { success: boolean; error?: string } {
        if (!tx.isValid()) {
            return { success: false, error: 'Cryptographic signature or transaction fields are invalid.' };
        }

        if (this.transactions.has(tx.id)) {
            return { success: false, error: 'Transaction already exists in mempool.' };
        }

        this.transactions.set(tx.id, tx);
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
     * Get candidate transactions to include in the next block (up to maxTxLimit)
     */
    public getCandidateTransactions(maxLimit = 500): Transaction[] {
        return this.getAll().slice(0, maxLimit);
    }

    /**
     * Remove transactions that were successfully mined into a block
     */
    public removeTransactions(txs: Transaction[]): void {
        for (const tx of txs) {
            this.transactions.delete(tx.id);
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
    }
}
