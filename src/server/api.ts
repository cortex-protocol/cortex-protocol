import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Blockchain } from '../core/blockchain';
import { P2PNetwork } from '../network/p2p';
import { CortexMiner } from '../mining/miner';
import { CortexCrypto } from '../core/crypto';
import { Transaction } from '../core/transaction';
import { Block } from '../core/block';
import { AIMemoryPayload } from '../core/memory';
import { CortexMiningPool } from '../pool/pool';

export function createApiServer(
    blockchain: Blockchain,
    p2p: P2PNetwork,
    miner: CortexMiner,
    pool: CortexMiningPool,
    port: number = 3000
) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Serve static frontend files
    const webDir = path.join(__dirname, '../web');
    app.use(express.static(webDir));

    // --- BLOCKCHAIN ENDPOINTS ---

    app.get('/api/stats', (req, res) => {
        const stats = blockchain.getStats();
        const minerStats = miner.getStats();
        const p2pStats = p2p.getNetworkStats();
        res.json({
            ...stats,
            miner: minerStats,
            network: p2pStats
        });
    });

    app.get('/api/blocks', (req, res) => {
        const limit = Math.min(100, Number(req.query.limit) || 20);
        const reversed = [...blockchain.chain].reverse().slice(0, limit);
        res.json(reversed);
    });

    app.get('/api/blocks/:identifier', (req, res) => {
        const id = req.params.identifier;
        let block;
        if (!isNaN(Number(id))) {
            block = blockchain.chain[Number(id)];
        } else {
            block = blockchain.chain.find(b => b.hash === id);
        }

        if (!block) {
            return res.status(404).json({ error: 'Block not found' });
        }
        res.json(block);
    });

    app.get('/api/mempool', (req, res) => {
        res.json(blockchain.mempool.getAll());
    });

    app.get('/api/balance/:address', (req, res) => {
        const address = req.params.address;
        const confirmedBalance = blockchain.getBalance(address);
        
        // Also calculate pending incoming and outgoing in mempool for instant responsiveness
        let pendingIncoming = 0;
        let pendingOutgoing = 0;
        for (const tx of blockchain.mempool.getAll()) {
            if (tx.recipient === address) {
                pendingIncoming += tx.amount;
            }
            if (tx.sender === address) {
                pendingOutgoing += (tx.amount + tx.fee + tx.burnAmount);
            }
        }

        const balance = +(Math.max(0, confirmedBalance + pendingIncoming - pendingOutgoing)).toFixed(6);
        const nonce = blockchain.getNextNonce(address);
        res.json({ address, balance, confirmedBalance, pendingIncoming, nonce });
    });

    // --- CHART METRICS ENDPOINT ---
    app.get('/api/chart/metrics', (req, res) => {
        const recentBlocks = blockchain.chain.slice(-20);
        const labels = recentBlocks.map(b => `#${b.index}`);
        const difficulties = recentBlocks.map(b => b.difficulty);
        const txCounts = recentBlocks.map(b => b.transactions.length);
        const timestamps = recentBlocks.map(b => b.timestamp);
        const miners = recentBlocks.map(b => b.minerAddress);
        const memoryCounts = recentBlocks.map(b => b.transactions.filter(t => t.type === 'MEMORY_COMMIT').length);

        const blockTimes: number[] = [];
        for (let i = 0; i < recentBlocks.length; i++) {
            if (i === 0) {
                blockTimes.push(15);
            } else {
                const deltaSec = Math.max(1, Math.round((recentBlocks[i].timestamp - recentBlocks[i - 1].timestamp) / 1000));
                blockTimes.push(Math.min(120, deltaSec));
            }
        }

        res.json({
            labels,
            difficulties,
            txCounts,
            timestamps,
            miners,
            memoryCounts,
            blockTimes,
            currentHashrate: miner.getStats().hashrate || 0
        });
    });

    // --- AI MEMORY & SEMANTIC SEARCH ENDPOINTS ---

    app.get('/api/memories', (req, res) => {
        const { agentId, topic, memoryType } = req.query;
        const memories = blockchain.queryMemories({
            agentId: agentId as string,
            topic: topic as string,
            memoryType: memoryType as string
        });
        res.json(memories);
    });

    // SEMANTIC VECTOR SEARCH (COSINE SIMILARITY TOP-K)
    app.get('/api/memories/search', (req, res) => {
        const query = req.query.q as string;
        if (!query) {
            return res.status(400).json({ error: 'Search query "q" parameter is required.' });
        }
        const topK = Math.min(20, Number(req.query.topK) || 5);
        const results = blockchain.searchSemanticMemories(query, topK);
        res.json(results);
    });

    // MERKLE PROOF GENERATOR
    app.get('/api/memories/proof/:txId', (req, res) => {
        const txId = req.params.txId;
        const proof = blockchain.getMemoryMerkleProof(txId);
        if (!proof.found) {
            return res.status(404).json(proof);
        }
        res.json(proof);
    });

    app.post('/api/memory/commit', (req, res) => {
        try {
            const body = req.body || {};
            const { agentPrivateKey, agentId, topic, content, memoryType = 'KNOWLEDGE_BASE', fee = 0.05 } = body;

            if (!agentPrivateKey || !agentId || !content || !topic) {
                return res.status(400).json({ error: 'agentPrivateKey, agentId, topic, and content are required.' });
            }

            const keyPair = CortexCrypto.fromPrivateKey(agentPrivateKey);
            const balance = blockchain.getBalance(keyPair.address);
            if (balance < fee) {
                return res.status(400).json({ error: `Insufficient CTX balance. Required: ${fee} CTX, Available: ${balance} CTX` });
            }

            const vectorHash = CortexCrypto.sha256(content);
            const payload: AIMemoryPayload = {
                agentId,
                agentPublicKey: keyPair.publicKey,
                memoryType,
                topic,
                content,
                vectorHash,
                accessLevel: 'PUBLIC'
            };

            const nonce = blockchain.getNextNonce(keyPair.address);
            const tx = Transaction.createMemoryCommit(keyPair.address, keyPair.publicKey, payload, fee, nonce);
            tx.sign(keyPair.privateKey, keyPair.publicKey);

            const result = blockchain.mempool.addTransaction(tx);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            p2p.broadcastTransaction(tx);
            res.json({ success: true, txId: tx.id, memoryPayload: payload });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- TESTNET FAUCET ENDPOINT ---
    const faucetClaims = new Map<string, number>();
    const FAUCET_PRIVATE_KEY = '4a7f92b938471029384710293847102938471029384710293847102938471029'; // Master Testnet Treasury
    const FAUCET_KEYPAIR = CortexCrypto.fromPrivateKey(FAUCET_PRIVATE_KEY);

    app.post('/api/faucet', (req, res) => {
        try {
            const body = req.body || {};
            const { address } = body;
            const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

            if (!address || !address.startsWith('ctx1') || address.length < 20) {
                return res.status(400).json({ error: 'Please provide a valid Cortex address starting with ctx1...' });
            }

            const now = Date.now();
            const lastClaimTime = faucetClaims.get(address.toLowerCase()) || 0;
            const COOLDOWN_MS = 10 * 1000; // 10 seconds on Testnet

            if (now - lastClaimTime < COOLDOWN_MS) {
                const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastClaimTime)) / 1000);
                return res.status(429).json({ error: `Faucet rate limited. Please wait ${remainingSec}s before requesting again.` });
            }

            const FAUCET_AMOUNT = 5.00;
            const fee = 0.01;
            const nonce = blockchain.getNextNonce(FAUCET_KEYPAIR.address);

            const tx = new Transaction({
                type: 'TRANSFER',
                sender: FAUCET_KEYPAIR.address,
                senderPublicKey: FAUCET_KEYPAIR.publicKey,
                recipient: address.trim(),
                amount: FAUCET_AMOUNT,
                fee: fee,
                burnAmount: 0,
                nonce: nonce,
                timestamp: now
            });

            tx.sign(FAUCET_KEYPAIR.privateKey, FAUCET_KEYPAIR.publicKey);

            const poolRes = blockchain.mempool.addTransaction(tx);
            if (!poolRes.success) {
                return res.status(400).json({ error: poolRes.error });
            }

            faucetClaims.set(address.toLowerCase(), now);
            faucetClaims.set(clientIp, now);
            p2p.broadcastTransaction(tx);

            res.json({
                success: true,
                message: `5.00 Testnet $CTX sent successfully to ${address}!`,
                txId: tx.id,
                amount: FAUCET_AMOUNT
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- INCENTIVIZED TESTNET 2.0 LEADERBOARD ENDPOINT ---
    app.get('/api/leaderboard', (req, res) => {
        try {
            const TOTAL_INCENTIVE_POOL = 210000; // 1% of 21,000,000 CTX
            const MINER_POOL = 147000;          // 70%
            const TESTER_POOL = 63000;          // 30%
            const MAX_CAP_PER_USER = 6300;      // 3% anti-whale hard cap

            const addressStats = new Map<string, {
                address: string;
                blocksMined: number;
                sharesSubmitted: number;
                stateCommits: number;
                transfers: number;
                balance: number;
                type: 'MINER' | 'TESTER' | 'HYBRID';
            }>();

            const getOrCreate = (addr: string) => {
                const norm = addr.trim();
                if (!addressStats.has(norm)) {
                    addressStats.set(norm, {
                        address: norm,
                        blocksMined: 0,
                        sharesSubmitted: 0,
                        stateCommits: 0,
                        transfers: 0,
                        balance: blockchain.getBalance(norm),
                        type: 'TESTER'
                    });
                }
                return addressStats.get(norm)!;
            };

            // 1. Scan confirmed blockchain
            for (const block of blockchain.chain) {
                if (block.minerAddress && !block.minerAddress.includes('genesis')) {
                    const s = getOrCreate(block.minerAddress);
                    s.blocksMined += 1;
                }

                for (const tx of block.transactions) {
                    if (tx.sender && !tx.sender.includes('COINBASE') && !tx.sender.includes('genesis')) {
                        const s = getOrCreate(tx.sender);
                        if (tx.type === 'MEMORY_COMMIT') {
                            s.stateCommits += 1;
                        } else {
                            s.transfers += 1;
                        }
                    }
                    if (tx.recipient && !tx.recipient.includes('0000000000000') && !tx.recipient.includes('genesis')) {
                        const s = getOrCreate(tx.recipient);
                        s.transfers += 1;
                    }
                }
            }

            // 2. Include pool shares
            const poolStats = pool.getStats();
            for (const m of poolStats.topMiners || []) {
                if (m.address) {
                    const s = getOrCreate(m.address);
                    s.sharesSubmitted += m.roundShares || 0;
                }
            }

            // 3. Filter valid accounts
            const entries = Array.from(addressStats.values()).filter(u => 
                u.address.length >= 20 &&
                !u.address.includes('0000000000000') && 
                !u.address.includes('ctx1genesis') && 
                !u.address.includes('COINBASE')
            );

            const totalScoreMiners = entries.reduce((sum, e) => sum + (e.blocksMined * 10 + e.sharesSubmitted), 0);
            const totalScoreTesters = entries.reduce((sum, e) => sum + (e.stateCommits * 5 + e.transfers), 0);

            const ranked = entries.map(e => {
                const minerRatio = totalScoreMiners > 0 ? (e.blocksMined * 10 + e.sharesSubmitted) / totalScoreMiners : 0;
                const testerRatio = totalScoreTesters > 0 ? (e.stateCommits * 5 + e.transfers) / totalScoreTesters : 0;

                let rawReward = (minerRatio * MINER_POOL) + (testerRatio * TESTER_POOL);
                if (rawReward <= 0 && (e.balance > 0 || e.transfers > 0)) {
                    rawReward = 15.0; // participation boost
                }

                const cappedReward = Math.min(rawReward, MAX_CAP_PER_USER);
                const day1Liquid = +(cappedReward * 0.20).toFixed(2);
                const vestedStream = +(cappedReward * 0.80).toFixed(2);

                const isMiner = e.blocksMined > 0 || e.sharesSubmitted > 0;
                const isTester = e.stateCommits > 0 || e.transfers > 0;
                const type: 'MINER' | 'TESTER' | 'HYBRID' = isMiner && isTester ? 'HYBRID' : isMiner ? 'MINER' : 'TESTER';

                return {
                    ...e,
                    type,
                    estimatedReward: +cappedReward.toFixed(2),
                    day1Liquid,
                    vestedStream,
                    sharePercent: +(cappedReward / TOTAL_INCENTIVE_POOL * 100).toFixed(3)
                };
            });

            // Sort by estimated reward descending
            ranked.sort((a, b) => b.estimatedReward - a.estimatedReward || b.blocksMined - a.blocksMined);

            const leaderboard = ranked.map((item, idx) => ({
                rank: idx + 1,
                ...item
            }));

            res.json({
                totalParticipants: leaderboard.length,
                totalIncentivePool: TOTAL_INCENTIVE_POOL,
                minerPool: MINER_POOL,
                testerPool: TESTER_POOL,
                antiWhaleCap: MAX_CAP_PER_USER,
                vestingSchedule: '20% Day 1 Liquid, 80% Streamed block-by-block over 90 Days',
                leaderboard
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- REAL AMM DEX ENGINE & LIQUIDITY POOL WITH DISK PERSISTENCE ---
    const dexStateFile = path.join(__dirname, '../../data/dex_state.json');
    let poolCtxReserve = 500000;
    let poolUsdcReserve = 622500;
    const userUsdcBalances = new Map<string, number>();

    function loadDexState() {
        try {
            if (fs.existsSync(dexStateFile)) {
                const raw = JSON.parse(fs.readFileSync(dexStateFile, 'utf8'));
                if (raw.poolCtx) poolCtxReserve = raw.poolCtx;
                if (raw.poolUsdc) poolUsdcReserve = raw.poolUsdc;
                if (raw.balances) {
                    for (const [k, v] of Object.entries(raw.balances)) {
                        userUsdcBalances.set(k.toLowerCase(), Number(v));
                    }
                }
            }
        } catch(e) {}
    }

    function saveDexState() {
        try {
            const dir = path.dirname(dexStateFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const obj = {
                poolCtx: poolCtxReserve,
                poolUsdc: poolUsdcReserve,
                balances: Object.fromEntries(userUsdcBalances.entries())
            };
            fs.writeFileSync(dexStateFile, JSON.stringify(obj, null, 2));
        } catch(e) {}
    }

    loadDexState();

    app.get('/api/dex/pool', (req, res) => {
        const spotPrice = +(poolUsdcReserve / poolCtxReserve).toFixed(4);
        res.json({
            poolCtx: poolCtxReserve,
            poolUsdc: poolUsdcReserve,
            spotPrice,
            feeTier: 0.003
        });
    });

    app.get('/api/dex/balance/:address', (req, res) => {
        const address = req.params.address;
        const confirmedBalance = blockchain.getBalance(address);
        
        let pendingIncoming = 0;
        let pendingOutgoing = 0;
        for (const tx of blockchain.mempool.getAll()) {
            if (tx.recipient === address) {
                pendingIncoming += tx.amount;
            }
            if (tx.sender === address) {
                pendingOutgoing += (tx.amount + tx.fee + tx.burnAmount);
            }
        }

        const ctxBal = +(Math.max(0, confirmedBalance + pendingIncoming - pendingOutgoing)).toFixed(6);
        const usdcBal = userUsdcBalances.get(address.toLowerCase()) ?? 1000.00;
        res.json({
            address,
            ctx: ctxBal,
            confirmedBalance,
            pendingIncoming,
            pendingOutgoing,
            usdc: usdcBal
        });
    });

    app.post('/api/dex/swap', (req, res) => {
        try {
            const { senderPrivateKey, fromSymbol, amountIn } = req.body || {};
            if (!senderPrivateKey || !fromSymbol || !amountIn || Number(amountIn) <= 0) {
                return res.status(400).json({ error: 'senderPrivateKey, fromSymbol, and positive amountIn are required.' });
            }

            const keyPair = CortexCrypto.fromPrivateKey(senderPrivateKey.trim());
            const userAddr = keyPair.address;
            const inAmount = Number(amountIn);
            const userUsdc = userUsdcBalances.get(userAddr.toLowerCase()) ?? 1000.00;

            if (fromSymbol === 'CTX') {
                const ctxBal = blockchain.getBalance(userAddr);
                const fee = 0.01;
                if (ctxBal < inAmount + fee) {
                    return res.status(400).json({ error: `Insufficient CTX balance. Required: ${inAmount + fee}, Available: ${ctxBal}` });
                }

                // AMM calculation: x * y = k with 0.3% fee
                const effectiveIn = inAmount * 0.997;
                const usdcOut = +( (poolUsdcReserve * effectiveIn) / (poolCtxReserve + effectiveIn) ).toFixed(4);

                poolCtxReserve += inAmount;
                poolUsdcReserve -= usdcOut;
                userUsdcBalances.set(userAddr.toLowerCase(), +(userUsdc + usdcOut).toFixed(4));
                saveDexState();

                // Send on-chain transaction to burn/transfer CTX to AMM pool
                const nonce = blockchain.getNextNonce(userAddr);
                const tx = new Transaction({
                    type: 'TRANSFER',
                    sender: userAddr,
                    senderPublicKey: keyPair.publicKey,
                    recipient: 'ctx1dexamm000000000000000000000000000000000000000000',
                    amount: inAmount,
                    fee: fee,
                    burnAmount: 0,
                    nonce: nonce,
                    timestamp: Date.now()
                });
                tx.sign(keyPair.privateKey, keyPair.publicKey);
                blockchain.mempool.addTransaction(tx);
                p2p.broadcastTransaction(tx);

                return res.json({
                    success: true,
                    txId: tx.id,
                    fromSymbol: 'CTX',
                    toSymbol: 'tUSDC',
                    amountIn: inAmount,
                    amountOut: usdcOut,
                    newUsdcBalance: userUsdcBalances.get(userAddr.toLowerCase()),
                    spotPrice: +(poolUsdcReserve / poolCtxReserve).toFixed(4)
                });
            } else if (fromSymbol === 'tUSDC') {
                if (userUsdc < inAmount) {
                    return res.status(400).json({ error: `Insufficient tUSDC balance. Available: ${userUsdc} tUSDC` });
                }

                const effectiveIn = inAmount * 0.997;
                const ctxOut = +( (poolCtxReserve * effectiveIn) / (poolUsdcReserve + effectiveIn) ).toFixed(4);

                poolUsdcReserve += inAmount;
                poolCtxReserve -= ctxOut;
                userUsdcBalances.set(userAddr.toLowerCase(), +(userUsdc - inAmount).toFixed(4));
                saveDexState();

                // Send CTX from Faucet/Treasury to user on-chain
                const fee = 0.01;
                const nonce = blockchain.getNextNonce(FAUCET_KEYPAIR.address);
                const tx = new Transaction({
                    type: 'TRANSFER',
                    sender: FAUCET_KEYPAIR.address,
                    senderPublicKey: FAUCET_KEYPAIR.publicKey,
                    recipient: userAddr,
                    amount: ctxOut,
                    fee: fee,
                    burnAmount: 0,
                    nonce: nonce,
                    timestamp: Date.now()
                });
                tx.sign(FAUCET_KEYPAIR.privateKey, FAUCET_KEYPAIR.publicKey);
                blockchain.mempool.addTransaction(tx);
                p2p.broadcastTransaction(tx);

                return res.json({
                    success: true,
                    txId: tx.id,
                    fromSymbol: 'tUSDC',
                    toSymbol: 'CTX',
                    amountIn: inAmount,
                    amountOut: ctxOut,
                    newUsdcBalance: userUsdcBalances.get(userAddr.toLowerCase()),
                    spotPrice: +(poolUsdcReserve / poolCtxReserve).toFixed(4)
                });
            } else {
                return res.status(400).json({ error: 'Unsupported token symbol' });
            }
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // SERVE DEDICATED STANDALONE DEX PAGE
    app.get('/dex', (req, res) => {
        res.sendFile(path.join(webDir, 'dex.html'));
    });
    app.get('/swap', (req, res) => {
        res.sendFile(path.join(webDir, 'dex.html'));
    });

    app.post('/api/wallet/create', (req, res) => {
        const keyPair = CortexCrypto.generateKeyPair();
        res.json({
            address: keyPair.address,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey
        });
    });

    app.post('/api/wallet/import', (req, res) => {
        try {
            const body = req.body || {};
            const { privateKey } = body;
            if (!privateKey) {
                return res.status(400).json({ error: 'privateKey is required.' });
            }
            const keyPair = CortexCrypto.fromPrivateKey(privateKey.trim());
            const balance = blockchain.getBalance(keyPair.address);
            res.json({
                address: keyPair.address,
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey,
                balance
            });
        } catch (err: any) {
            res.status(400).json({ error: 'Invalid private key format.' });
        }
    });

    app.post('/api/transactions/send', (req, res) => {
        try {
            const body = req.body || {};
            const { privateKey, recipient, amount, fee = 0.01 } = body;

            if (!privateKey || !recipient || !amount || Number(amount) <= 0) {
                return res.status(400).json({ error: 'privateKey, recipient and positive amount are required.' });
            }

            const keyPair = CortexCrypto.fromPrivateKey(privateKey);
            const balance = blockchain.getBalance(keyPair.address);
            const totalRequired = Number(amount) + Number(fee);

            if (balance < totalRequired) {
                return res.status(400).json({
                    error: `Insufficient balance. Required: ${totalRequired} CTX, Available: ${balance} CTX`
                });
            }

            const nonce = blockchain.getNextNonce(keyPair.address);
            const tx = new Transaction({
                type: 'TRANSFER',
                sender: keyPair.address,
                senderPublicKey: keyPair.publicKey,
                recipient: recipient.trim(),
                amount: Number(amount),
                fee: Number(fee),
                burnAmount: 0,
                nonce: nonce,
                timestamp: Date.now()
            });

            tx.sign(keyPair.privateKey, keyPair.publicKey);

            const poolRes = blockchain.mempool.addTransaction(tx);
            if (!poolRes.success) {
                return res.status(400).json({ error: poolRes.error });
            }

            p2p.broadcastTransaction(tx);
            res.json({ success: true, txId: tx.id, transaction: tx });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- MINING CONTROL ENDPOINTS ---

    app.get('/api/miner/stats', (req, res) => {
        res.json(miner.getStats());
    });

    app.post('/api/miner/start', (req, res) => {
        const body = req.body || {};
        const { minerAddress } = body;
        if (minerAddress) {
            miner.setMinerAddress(minerAddress);
        }

        miner.startContinuousMining();
        res.json({ success: true, message: 'Mining started', stats: miner.getStats() });
    });

    app.post('/api/miner/stop', (req, res) => {
        miner.stopMining();
        res.json({ success: true, message: 'Mining stopped', stats: miner.getStats() });
    });

    app.post('/api/miner/mine-one', async (req, res) => {
        const body = req.body || {};
        const { minerAddress } = body;
        if (minerAddress) {
            miner.setMinerAddress(minerAddress);
        }

        const result = await miner.mineNextBlockAsync(200000);
        if (result.success && result.block) {
            p2p.broadcastBlock(result.block);
        }
        res.json(result);
    });

    // --- DISTRIBUTED MINING / TEMPLATE & SUBMIT ENDPOINTS ---
    app.get('/api/miner/template', (req, res) => {
        try {
            const address = (req.query.address as string) || FAUCET_KEYPAIR.address;
            const latestBlock = blockchain.getLatestBlock();
            const nextIndex = latestBlock.index + 1;
            const difficulty = blockchain.getDifficulty();
            const reward = blockchain.getCurrentBlockReward(nextIndex);
            const candidateTxs = blockchain.mempool.getCandidateTransactions();
            const totalFees = candidateTxs.reduce((sum, tx) => sum + tx.fee, 0);

            const coinbaseTx = Transaction.createCoinbase(address, reward, totalFees);
            const blockTransactions = [coinbaseTx, ...candidateTxs];
            const timestamp = Date.now();

            const block = new Block(
                nextIndex,
                latestBlock.hash,
                timestamp,
                blockTransactions,
                difficulty,
                0,
                address
            );

            res.json({
                index: block.index,
                previousHash: block.previousHash,
                timestamp: block.timestamp,
                difficulty: block.difficulty,
                minerAddress: block.minerAddress,
                merkleRoot: block.merkleRoot,
                memoryRoot: block.memoryRoot,
                headerPrefix: `${block.index}:${block.previousHash}:${block.timestamp}:${block.merkleRoot}:${block.memoryRoot}:${block.difficulty}:`,
                headerSuffix: `:${block.minerAddress}`,
                targetPrefix: '0'.repeat(difficulty),
                reward,
                transactions: block.transactions
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/miner/submit-block', (req, res) => {
        try {
            const body = req.body || {};
            const { index, previousHash, timestamp, transactions, difficulty, nonce, minerAddress, hash } = body;

            if (!minerAddress || !hash || nonce === undefined) {
                return res.status(400).json({ error: 'Invalid block submission parameters.' });
            }

            const block = new Block(
                Number(index),
                previousHash,
                Number(timestamp),
                transactions || [],
                Number(difficulty),
                Number(nonce),
                minerAddress,
                hash
            );

            const addRes = blockchain.addBlock(block);
            if (addRes.success) {
                p2p.broadcastBlock(block);
                console.log(`\n🎉 [REMOTE MINER] Block #${block.index} mined by ${minerAddress}! Reward: ${block.transactions[0]?.amount} CTX`);
                res.json({
                    success: true,
                    message: `Block #${block.index} accepted into blockchain!`,
                    blockIndex: block.index,
                    reward: block.transactions[0]?.amount || 50,
                    hash: block.hash
                });
            } else {
                res.status(400).json({ error: addRes.error });
            }
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- P2P NETWORK ENDPOINTS ---

    app.get('/api/p2p/status', (req, res) => {
        res.json(p2p.getNetworkStats());
    });

    app.post('/api/p2p/connect', (req, res) => {
        const body = req.body || {};
        const { peer } = body;
        if (!peer) {
            return res.status(400).json({ error: 'peer URL is required' });
        }
        p2p.connectToPeer(peer);
        res.json({ success: true, message: `Connecting to ${peer}` });
    });

    // --- MINING POOL ENDPOINTS ---
    app.get('/api/pool/stats', (req, res) => {
        res.json(pool.getStats());
    });

    app.get('/api/pool/miner/:address', (req, res) => {
        res.json(pool.getMinerStats(req.params.address));
    });

    app.get('/api/pool/template', (req, res) => {
        try {
            const address = (req.query.address as string) || '';
            const worker = (req.query.worker as string) || 'worker-1';
            if (!address) {
                return res.status(400).json({ error: 'Miner address is required.' });
            }
            const template = pool.getWorkTemplate(address, worker);
            res.json(template);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/pool/submit-share', (req, res) => {
        try {
            const body = req.body || {};
            const result = pool.submitShare(body);
            if (!result.validShare) {
                return res.status(400).json(result);
            }
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return app;
}
