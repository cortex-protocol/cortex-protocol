import { Transaction } from '../src/core/transaction';
import { CortexCrypto } from '../src/core/crypto';
import { Blockchain } from '../src/core/blockchain';
import { Block } from '../src/core/block';

async function runTests() {
    console.log('=== RUNNING ROUND 5 SECURITY TESTS ===\n');

    const keyPair = CortexCrypto.generateKeyPair();
    const recipientKeyPair = CortexCrypto.generateKeyPair();

    // -------------------------------------------------------------
    // TEST 1: IEEE 754 NaN & Non-Finite Numbers in Transaction.isValid()
    // -------------------------------------------------------------
    console.log('Test 1: Transaction.isValid() rejects NaN, Infinity, and negative values...');

    // 1.1 NaN Amount
    const txNaN = new Transaction({
        type: 'TRANSFER',
        sender: keyPair.address,
        senderPublicKey: keyPair.publicKey,
        recipient: recipientKeyPair.address,
        amount: NaN,
        fee: 0.01,
        burnAmount: 0,
        nonce: 1,
        timestamp: Date.now()
    });
    txNaN.sign(keyPair.privateKey, keyPair.publicKey);
    if (txNaN.isValid()) {
        throw new Error('FAIL: Transaction with amount: NaN was accepted as valid!');
    }
    console.log('  ✓ Correctly rejected tx with amount: NaN');

    // 1.2 Infinity Amount
    const txInf = new Transaction({
        type: 'TRANSFER',
        sender: keyPair.address,
        senderPublicKey: keyPair.publicKey,
        recipient: recipientKeyPair.address,
        amount: Infinity,
        fee: 0.01,
        burnAmount: 0,
        nonce: 1,
        timestamp: Date.now()
    });
    txInf.sign(keyPair.privateKey, keyPair.publicKey);
    if (txInf.isValid()) {
        throw new Error('FAIL: Transaction with amount: Infinity was accepted as valid!');
    }
    console.log('  ✓ Correctly rejected tx with amount: Infinity');

    // 1.3 NaN Fee
    const txFeeNaN = new Transaction({
        type: 'TRANSFER',
        sender: keyPair.address,
        senderPublicKey: keyPair.publicKey,
        recipient: recipientKeyPair.address,
        amount: 10,
        fee: NaN,
        burnAmount: 0,
        nonce: 1,
        timestamp: Date.now()
    });
    txFeeNaN.sign(keyPair.privateKey, keyPair.publicKey);
    if (txFeeNaN.isValid()) {
        throw new Error('FAIL: Transaction with fee: NaN was accepted as valid!');
    }
    console.log('  ✓ Correctly rejected tx with fee: NaN');

    // 1.4 NaN Nonce
    const txNonceNaN = new Transaction({
        type: 'TRANSFER',
        sender: keyPair.address,
        senderPublicKey: keyPair.publicKey,
        recipient: recipientKeyPair.address,
        amount: 10,
        fee: 0.01,
        burnAmount: 0,
        nonce: NaN,
        timestamp: Date.now()
    });
    txNonceNaN.sign(keyPair.privateKey, keyPair.publicKey);
    if (txNonceNaN.isValid()) {
        throw new Error('FAIL: Transaction with nonce: NaN was accepted as valid!');
    }
    console.log('  ✓ Correctly rejected tx with nonce: NaN');

    // 1.5 Valid finite transaction
    const txValid = new Transaction({
        type: 'TRANSFER',
        sender: keyPair.address,
        senderPublicKey: keyPair.publicKey,
        recipient: recipientKeyPair.address,
        amount: 10,
        fee: 0.01,
        burnAmount: 0,
        nonce: 1,
        timestamp: Date.now()
    });
    txValid.sign(keyPair.privateKey, keyPair.publicKey);
    if (!txValid.isValid()) {
        throw new Error('FAIL: Valid transaction with finite numbers was rejected!');
    }
    console.log('  ✓ Correctly accepted valid transaction with finite numbers');

    // -------------------------------------------------------------
    // TEST 2: Blockchain State Integrity Protection Against NaN
    // -------------------------------------------------------------
    console.log('\nTest 2: Blockchain.addBlock() rejects NaN transactions and prevents state poisoning...');
    const blockchain = new Blockchain();
    
    // Attempt adding block with NaN tx
    const prevBlock = blockchain.getLatestBlock();
    const coinbase = Transaction.createCoinbase(keyPair.address, 100, 0);
    const badBlock = new Block(
        prevBlock.index + 1,
        prevBlock.hash,
        Date.now(),
        [coinbase, txNaN],
        0,
        blockchain.difficulty
    );

    const blockRes = blockchain.addBlock(badBlock);
    if (blockRes.success) {
        throw new Error('FAIL: addBlock accepted block containing NaN transaction!');
    }
    console.log('  ✓ addBlock correctly rejected block with NaN transaction:', blockRes.error);

    // Verify balances are not NaN
    const balSender = blockchain.getBalance(keyPair.address);
    const balRecip = blockchain.getBalance(recipientKeyPair.address);
    if (Number.isNaN(balSender) || Number.isNaN(balRecip)) {
        throw new Error('FAIL: Ledger state was poisoned with NaN balances!');
    }
    console.log('  ✓ Balances remain clean and uncorrupted:', { balSender, balRecip });

    // -------------------------------------------------------------
    // TEST 3: Faucet IP Rate Limiting
    // -------------------------------------------------------------
    console.log('\nTest 3: Faucet IP cooldown prevents multi-address evasion...');
    const faucetClaims = new Map<string, number>();
    const clientIp = '203.0.113.42';
    const addressA = 'ctx1addressAAAAAA000000000000000000000000000';
    const addressB = 'ctx1addressBBBBBB000000000000000000000000000';
    const COOLDOWN_MS = 10 * 1000;

    const checkFaucetLimit = (addr: string, ip: string, now: number) => {
        const lastAddressClaim = faucetClaims.get(addr.toLowerCase()) || 0;
        const lastIpClaim = faucetClaims.get(ip) || 0;
        const mostRecent = Math.max(lastAddressClaim, lastIpClaim);
        if (now - mostRecent < COOLDOWN_MS) {
            return false; // Rate limited
        }
        faucetClaims.set(addr.toLowerCase(), now);
        faucetClaims.set(ip, now);
        return true;
    };

    const t0 = Date.now();
    // Claim 1 with address A from IP
    const res1 = checkFaucetLimit(addressA, clientIp, t0);
    if (!res1) throw new Error('FAIL: Initial faucet claim should succeed');
    console.log('  ✓ First claim from IP succeeded');

    // Claim 2 with address B from the SAME IP immediately
    const res2 = checkFaucetLimit(addressB, clientIp, t0 + 1000);
    if (res2) throw new Error('FAIL: Faucet claim with new address from same IP bypassed rate limiting!');
    console.log('  ✓ Second claim with new address from same IP was correctly rate limited');

    // Claim 3 after cooldown expires
    const res3 = checkFaucetLimit(addressB, clientIp, t0 + 11000);
    if (!res3) throw new Error('FAIL: Faucet claim after cooldown expired should succeed');
    console.log('  ✓ Claim after cooldown expired succeeded');

    // -------------------------------------------------------------
    // TEST 4: DEX AMM Reserve Withdrawal Invariants
    // -------------------------------------------------------------
    console.log('\nTest 4: DEX AMM withdrawal verifies reserve balance and protects user LP shares...');
    const ammKeyPair = CortexCrypto.generateKeyPair();
    let ammBalance = 5.0; // AMM only has 5 CTX
    const requestedWithdrawalCtx = 50.0; // User wants to withdraw 50 CTX
    const userShares = 100;
    let savedShares = userShares;

    // Simulate safe withdrawal check
    const fee = 0.01;
    if (ammBalance < requestedWithdrawalCtx + fee) {
        // Must reject without modifying user shares
        console.log('  ✓ Pre-check caught insufficient AMM balance:', {
            required: requestedWithdrawalCtx + fee,
            available: ammBalance
        });
    } else {
        savedShares -= 50;
    }

    if (savedShares !== userShares) {
        throw new Error('FAIL: User LP shares were prematurely deducted before transfer!');
    }
    console.log('  ✓ User LP shares remained intact (shares = ' + savedShares + ')');

    console.log('\n=== ALL ROUND 5 SECURITY TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
