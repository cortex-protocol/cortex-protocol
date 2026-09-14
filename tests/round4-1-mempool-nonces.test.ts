import { Mempool } from '../src/core/mempool';
import { Transaction } from '../src/core/transaction';
import { CortexCrypto } from '../src/core/crypto';
import { Blockchain } from '../src/core/blockchain';
import { Block } from '../src/core/block';
import * as fs from 'fs';
import * as path from 'path';

async function runTests() {
    console.log("=== RUNNING ROUND 4.1 MEMPOOL NONCE & TEMPLATE TESTS ===\n");

    const keypairA = CortexCrypto.generateKeyPair();
    const keypairB = CortexCrypto.generateKeyPair();

    // Helper to create and sign a test transaction
    function createTx(senderKeypair: any, recipient: string, amount: number, fee: number, nonce: number) {
        const tx = new Transaction({
            type: 'TRANSFER',
            sender: senderKeypair.address,
            senderPublicKey: senderKeypair.publicKey,
            recipient: recipient,
            amount,
            fee,
            nonce,
            timestamp: Date.now()
        });
        tx.sign(senderKeypair.privateKey, senderKeypair.publicKey);
        return tx;
    }

    // -------------------------------------------------------------------------
    // TEST 1: Mempool.addTransaction() rejects stale nonces (<= confirmedNonce)
    // -------------------------------------------------------------------------
    console.log("Test 1: Mempool.addTransaction() rejects stale nonces...");
    {
        const mempool = new Mempool();
        mempool.setNonceProvider((addr) => (addr === keypairA.address ? 42 : -1));

        // Attempt tx with nonce 38 (stale, like incident block #17012)
        const txStale1 = createTx(keypairA, keypairB.address, 10, 0.05, 38);
        const resStale1 = mempool.addTransaction(txStale1);
        if (resStale1.success) {
            throw new Error("Mempool should have rejected stale nonce 38 (confirmed is 42)");
        }
        console.log(`  ✓ Correctly rejected tx with stale nonce 38: ${resStale1.error}`);

        // Attempt tx with nonce 42 (equal to confirmed, must be strictly greater)
        const txStale2 = createTx(keypairA, keypairB.address, 10, 0.05, 42);
        const resStale2 = mempool.addTransaction(txStale2);
        if (resStale2.success) {
            throw new Error("Mempool should have rejected nonce equal to confirmed (42)");
        }
        console.log(`  ✓ Correctly rejected tx with equal nonce 42: ${resStale2.error}`);

        // Attempt tx with nonce 43 (strictly greater -> valid)
        const txValid = createTx(keypairA, keypairB.address, 10, 0.05, 43);
        const resValid = mempool.addTransaction(txValid);
        if (!resValid.success) {
            throw new Error(`Mempool rejected valid nonce 43: ${resValid.error}`);
        }
        console.log(`  ✓ Correctly accepted tx with valid nonce 43`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Replace-By-Fee (RBF) for duplicate nonces
    // -------------------------------------------------------------------------
    console.log("\nTest 2: Replace-By-Fee (RBF) for identical nonces from the same sender...");
    {
        const mempool = new Mempool();
        mempool.setNonceProvider(() => 0);

        // First tx with nonce 1, fee 0.01
        const txLowFee = createTx(keypairA, keypairB.address, 10, 0.01, 1);
        const res1 = mempool.addTransaction(txLowFee);
        if (!res1.success) throw new Error("Failed to add initial tx");

        // Second tx with same nonce 1 and same/lower fee -> rejected
        const txSameFee = createTx(keypairA, keypairB.address, 15, 0.01, 1);
        const res2 = mempool.addTransaction(txSameFee);
        if (res2.success) throw new Error("Should reject equal fee tx with identical nonce");
        console.log(`  ✓ Correctly rejected duplicate nonce with equal/lower fee: ${res2.error}`);

        // Third tx with same nonce 1 and higher fee 0.05 -> replaces txLowFee
        const txHighFee = createTx(keypairA, keypairB.address, 20, 0.05, 1);
        const res3 = mempool.addTransaction(txHighFee);
        if (!res3.success) throw new Error("Should accept higher fee tx via RBF");
        if (mempool.size() !== 1) throw new Error(`Expected mempool size 1 after RBF, got ${mempool.size()}`);
        if (mempool.getTransaction(txHighFee.id) === undefined) throw new Error("High fee tx not found");
        if (mempool.getTransaction(txLowFee.id) !== undefined) throw new Error("Low fee tx was not replaced");
        console.log(`  ✓ Successfully replaced lower fee transaction via Replace-By-Fee (RBF)`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: getCandidateTransactions() purges stale nonces (Block #17012 DoS Guard)
    // -------------------------------------------------------------------------
    console.log("\nTest 3: getCandidateTransactions() purges stale nonces & eliminates mining deadlock...");
    {
        const mempool = new Mempool();
        // Add txs before nonce provider is updated (simulating network advancement elsewhere)
        const txDeadlock = createTx(keypairA, keypairB.address, 5, 1.0, 38); // high fee stale tx
        const txLegit = createTx(keypairB, keypairA.address, 1, 0.01, 5);    // valid tx

        mempool.addTransaction(txDeadlock);
        mempool.addTransaction(txLegit);
        if (mempool.size() !== 2) throw new Error("Failed to seed mempool");

        // Now query candidates with keypairA on-chain nonce = 42
        const candidates = mempool.getCandidateTransactions(500, (addr) => {
            if (addr === keypairA.address) return 42;
            return 0;
        });

        // The stale tx (nonce 38 <= 42) must be completely purged and excluded
        if (candidates.some(tx => tx.id === txDeadlock.id)) {
            throw new Error("Stale deadlock transaction was included in block template!");
        }
        if (candidates.length !== 1 || candidates[0].id !== txLegit.id) {
            throw new Error(`Expected only valid transaction, got ${candidates.length} candidates`);
        }
        if (mempool.getTransaction(txDeadlock.id) !== undefined) {
            throw new Error("Stale transaction was not purged from mempool storage");
        }
        console.log(`  ✓ Stale high-fee transaction was purged and excluded from block candidates`);
        console.log(`  ✓ Block template contains only valid unconfirmed transactions`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Multi-queue ordering enforces per-sender nonce ASC
    // -------------------------------------------------------------------------
    console.log("\nTest 4: Candidate selection guarantees ascending nonce order (nonce ASC) per sender...");
    {
        const mempool = new Mempool();
        mempool.setNonceProvider(() => 0);

        // Alice sends nonce 1 with fee 0.01, and nonce 2 with fee 0.10
        const txA1 = createTx(keypairA, keypairB.address, 5, 0.01, 1);
        const txA2 = createTx(keypairA, keypairB.address, 5, 0.10, 2);

        // Bob sends nonce 1 with fee 0.05
        const txB1 = createTx(keypairB, keypairA.address, 5, 0.05, 1);

        mempool.addTransaction(txA1);
        mempool.addTransaction(txA2);
        mempool.addTransaction(txB1);

        const candidates = mempool.getCandidateTransactions(500);

        // In pure fee sorting, order was [A2 (0.10), B1 (0.05), A1 (0.01)], which invalidates Alice's nonces.
        // With multi-queue per-sender ordering, A1 must appear BEFORE A2!
        const indexA1 = candidates.findIndex(t => t.id === txA1.id);
        const indexA2 = candidates.findIndex(t => t.id === txA2.id);

        if (indexA1 === -1 || indexA2 === -1) {
            throw new Error("Candidate list is missing Alice's transactions");
        }
        if (indexA1 > indexA2) {
            throw new Error(`Ordering violation: Tx A2 (nonce 2) placed before Tx A1 (nonce 1)! A1: ${indexA1}, A2: ${indexA2}`);
        }
        console.log(`  ✓ Candidate ordering preserved per-sender nonce ASC: A1 (nonce ${txA1.nonce}) at #${indexA1} precedes A2 (nonce ${txA2.nonce}) at #${indexA2}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Full In-Block Simulation with Blockchain.addBlock()
    // -------------------------------------------------------------------------
    console.log("\nTest 5: Full block simulation passes Blockchain.addBlock() without nonce reversion...");
    {
        const testDir = path.join(__dirname, `../.tmp_test_chain_${Date.now()}`);
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        try {
            const blockchain = new Blockchain({ initialDifficulty: 1 }, testDir);
            const minerKey = CortexCrypto.generateKeyPair();

            // 1. Mine block 1 to give miner some coins
            const latest = blockchain.getLatestBlock();
            const reward1 = blockchain.getCurrentBlockReward(latest.index + 1);
            const cb1 = Transaction.createCoinbase(minerKey.address, reward1, 0);
            const b1 = new Block(latest.index + 1, latest.hash, Date.now(), [cb1], 1, 0, minerKey.address);
            while (!b1.hash.startsWith('0')) {
                b1.nonce++;
                b1.hash = b1.calculateHash();
            }
            const resB1 = blockchain.addBlock(b1);
            if (!resB1.success) throw new Error(`Block 1 failed: ${resB1.error}`);

            // 2. Miner creates 2 transactions from same sender: nonce 0 (fee 0.001) and nonce 1 (fee 0.05)
            // Notice: second tx has MUCH higher fee than first tx!
            const txM0 = createTx(minerKey, keypairA.address, 10, 0.001, 0);
            const txM1 = createTx(minerKey, keypairB.address, 10, 0.050, 1);

            const addRes0 = blockchain.mempool.addTransaction(txM0);
            const addRes1 = blockchain.mempool.addTransaction(txM1);
            if (!addRes0.success || !addRes1.success) {
                throw new Error(`Failed to enqueue transactions to mempool: ${addRes0.error || addRes1.error}`);
            }

            // 3. Obtain candidate transactions for Block 2
            const candidateTxs = blockchain.mempool.getCandidateTransactions();
            const totalFees = candidateTxs.reduce((sum, tx) => sum + tx.fee, 0);
            const reward2 = blockchain.getCurrentBlockReward(b1.index + 1);
            const cb2 = Transaction.createCoinbase(minerKey.address, reward2, totalFees);

            const b2 = new Block(
                b1.index + 1,
                b1.hash,
                Date.now(),
                [cb2, ...candidateTxs],
                1,
                0,
                minerKey.address
            );

            while (!b2.hash.startsWith('0')) {
                b2.nonce++;
                b2.hash = b2.calculateHash();
            }

            // 4. Ingest Block 2 into blockchain
            const resB2 = blockchain.addBlock(b2);
            if (!resB2.success) {
                throw new Error(`Block 2 rejected by blockchain: ${resB2.error}`);
            }
            console.log(`  ✓ Block 2 with multi-tx ascending nonce sequence successfully ingested!`);
            console.log(`  ✓ Confirmed on-chain nonce for miner is now: ${blockchain.getConfirmedNonce(minerKey.address)}`);
            console.log(`  ✓ Mempool size after block confirmation: ${blockchain.mempool.size()}`);

            // Allow background async flush to complete before directory cleanup
            await new Promise(r => setTimeout(r, 200));
        } finally {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        }
    }

    console.log("\n=== ALL ROUND 4.1 MEMPOOL NONCE TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
});
