import { Mempool } from '../src/core/mempool';
import { Transaction } from '../src/core/transaction';
import { CortexCrypto } from '../src/core/crypto';

console.log('====================================================');
console.log('🧪 RUNNING MEMPOOL & NONCE VALIDATION TEST SUITE');
console.log('====================================================\n');

const senderA = CortexCrypto.generateKeyPair();
const senderB = CortexCrypto.generateKeyPair();
const recipient = CortexCrypto.generateKeyPair().address;

function createSignedTx(keyPair: any, nonce: number, fee: number, amount = 1.0) {
    const tx = new Transaction({
        type: 'TRANSFER',
        sender: keyPair.address,
        senderPublicKey: keyPair.publicKey,
        recipient: recipient,
        amount: amount,
        fee: fee,
        burnAmount: 0,
        nonce: nonce,
        timestamp: Date.now()
    });
    tx.sign(keyPair.privateKey, keyPair.publicKey);
    return tx;
}

const mempool = new Mempool();
const confirmedNonces = new Map<string, number>([
    [senderA.address, 10], // senderA confirmed nonce is 10
    [senderB.address, 5]   // senderB confirmed nonce is 5
]);

const balanceProvider = (_addr: string) => 1000.0;
const nonceProvider = (addr: string) => confirmedNonces.get(addr) ?? -1;

// --- TEST 1: Reject stale nonce in addTransaction ---
console.log('Test 1: Stale nonce rejection in addTransaction...');
const staleTx = createSignedTx(senderA, 10, 0.05); // nonce 10 <= confirmed 10
const res1 = mempool.addTransaction(staleTx, balanceProvider, nonceProvider);
if (!res1.success && res1.error?.includes('Invalid nonce')) {
    console.log('  ✓ PASSED: Stale nonce (10 <= 10) was rejected:', res1.error);
} else {
    console.error('  ❌ FAILED: Stale nonce was not rejected!', res1);
    process.exit(1);
}

// --- TEST 2: Accept valid higher nonce in addTransaction ---
console.log('\nTest 2: Valid future nonce acceptance in addTransaction...');
const validTx1 = createSignedTx(senderA, 12, 0.01); // nonce 12 > 10 (higher nonce, lower fee)
const validTx2 = createSignedTx(senderA, 11, 0.05); // nonce 11 > 10 (lower nonce, higher fee)
const validTxB1 = createSignedTx(senderB, 6, 0.03); // senderB nonce 6 > 5

const resA1 = mempool.addTransaction(validTx1, balanceProvider, nonceProvider);
const resA2 = mempool.addTransaction(validTx2, balanceProvider, nonceProvider);
const resB1 = mempool.addTransaction(validTxB1, balanceProvider, nonceProvider);

if (resA1.success && resA2.success && resB1.success) {
    console.log('  ✓ PASSED: Valid transactions added to mempool');
} else {
    console.error('  ❌ FAILED: Valid transactions rejected', { resA1, resA2, resB1 });
    process.exit(1);
}

// --- TEST 3: Block Candidate Selection & Sequential Ordering ---
console.log('\nTest 3: Block template ordering guarantees sequential nonce ASC per sender...');
const mempool2 = new Mempool();
const txA_highNonce_highFee = createSignedTx(senderA, 12, 0.10); // Nonce 12, fee 0.10
const txA_lowNonce_lowFee = createSignedTx(senderA, 11, 0.01);   // Nonce 11, fee 0.01

mempool2.addTransaction(txA_highNonce_highFee, balanceProvider);
mempool2.addTransaction(txA_lowNonce_lowFee, balanceProvider);

const candidates = mempool2.getCandidateTransactions(500, nonceProvider);
console.log('  Candidates selected for block:');
candidates.forEach((tx, i) => {
    console.log(`    [${i}] Sender: ${tx.sender.substring(0, 10)}... | Nonce: ${tx.nonce} | Fee: ${tx.fee}`);
});

if (candidates.length === 2 && candidates[0].nonce === 11 && candidates[1].nonce === 12) {
    console.log('  ✓ PASSED: Nonce 11 strictly precedes Nonce 12! Block #17012 deadlock prevented!');
} else {
    console.error('  ❌ FAILED: Incorrect candidate ordering!', candidates.map(c => c.nonce));
    process.exit(1);
}

// --- TEST 4: Filtering of transactions that became stale while sitting in mempool ---
console.log('\nTest 4: Filtering stale transactions during block template generation...');
confirmedNonces.set(senderA.address, 11);
const candidatesAfterConfirmation = mempool2.getCandidateTransactions(500, nonceProvider);
if (candidatesAfterConfirmation.length === 1 && candidatesAfterConfirmation[0].nonce === 12) {
    console.log('  ✓ PASSED: Stale nonce 11 was automatically filtered out of the block template!');
} else {
    console.error('  ❌ FAILED: Stale transaction was not filtered out!', candidatesAfterConfirmation);
    process.exit(1);
}

console.log('\n🎉 ALL 4/4 UNIT & INTEGRATION TESTS PASSED PERFECTLY!\n');
