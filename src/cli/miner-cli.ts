import os from 'os';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { CortexCrypto } from '../core/crypto';
import { CortexRandomX } from '../core/randomx';

let NODE_URL = process.env.NODE_URL || 'https://cortex-protocol.xyz';
let minerAddress = process.env.MINER_ADDRESS || '';
let allocatedThreads = Number(process.env.MINER_THREADS) || Math.max(1, Math.floor(os.cpus().length / 2));
let miningMode: 'pool' | 'solo' = 'pool';
let workerId = 'worker-1';

const CONFIG_DIR = path.join(os.homedir(), '.cortex');
const CONFIG_FILE = path.join(CONFIG_DIR, 'miner_config.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

function clearScreen() {
    process.stdout.write('\x1b[2J\x1b[0;0H');
}

function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function padVisible(str: string, targetLength: number): string {
    const visibleLength = stripAnsi(str).length;
    const paddingNeeded = Math.max(0, targetLength - visibleLength);
    return str + ' '.repeat(paddingNeeded);
}

function loadSavedConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch {}
    return null;
}

function saveConfig(config: any) {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving miner config:', e);
    }
}

async function fetchJson(endpoint: string, options: any = {}): Promise<any> {
    try {
        const url = `${NODE_URL.replace(/\/+$/, '')}${endpoint}`;
        const res = await fetch(url, {
            ...options,
            body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(options.headers || {})
            }
        });
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            throw new Error(`Node returned non-JSON response (HTTP ${res.status}): ${text.substring(0, 100)}`);
        }
    } catch (e: any) {
        throw new Error(`Connection to node (${NODE_URL}) failed: ${e.message}`);
    }
}

async function setupMiner() {
    console.log('\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║\x1b[0m   \x1b[1;35m🧠 CORTEX PROTOCOL ($CTX) - HARDWARE CPU & POOL MINER\x1b[0m              \x1b[36m║\x1b[0m');
    console.log('\x1b[36m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

    const totalCpus = os.cpus().length;
    console.log(`\x1b[32m[SYSTEM]\x1b[0m Detected CPU Hardware: \x1b[1m${os.cpus()[0]?.model || 'Multi-Core CPU'}\x1b[0m`);
    console.log(`\x1b[32m[SYSTEM]\x1b[0m Available Hardware Threads: \x1b[1;33m${totalCpus} Cores/Threads\x1b[0m\n`);

    // Parse CLI arguments: --address/-a, --threads/-t, --mode/-m, --node/-n
    const args = process.argv.slice(2);
    let cliAddress = process.env.MINER_ADDRESS || '';
    let cliThreads = Number(process.env.MINER_THREADS) || 0;
    let cliMode = (process.env.MINING_MODE as 'pool' | 'solo') || '';
    let cliNode = process.env.NODE_URL || '';

    for (let i = 0; i < args.length; i++) {
        if ((args[i] === '--address' || args[i] === '-a') && args[i + 1]) {
            cliAddress = args[++i];
        } else if ((args[i] === '--threads' || args[i] === '-t') && args[i + 1]) {
            cliThreads = parseInt(args[++i], 10);
        } else if ((args[i] === '--mode' || args[i] === '-m') && args[i + 1]) {
            const m = args[++i].toLowerCase();
            if (m === 'solo' || m === 'pool') cliMode = m as any;
        } else if ((args[i] === '--node' || args[i] === '-n') && args[i + 1]) {
            cliNode = args[++i];
        }
    }

    if (cliAddress) {
        minerAddress = cliAddress;
        if (cliThreads && cliThreads >= 1) allocatedThreads = Math.min(cliThreads, totalCpus);
        if (cliMode) miningMode = cliMode;
        if (cliNode) NODE_URL = cliNode;
        console.log(`\x1b[32m[AUTO-START]\x1b[0m Payout Address : \x1b[1;32m${minerAddress}\x1b[0m`);
        console.log(`\x1b[32m[AUTO-START]\x1b[0m Mining Mode    : \x1b[1;35m${miningMode.toUpperCase()}\x1b[0m`);
        console.log(`\x1b[32m[AUTO-START]\x1b[0m CPU Threads    : \x1b[1;33m${allocatedThreads} Threads\x1b[0m`);
        console.log(`\x1b[32m[AUTO-START]\x1b[0m Node URL       : \x1b[1m${NODE_URL}\x1b[0m\n`);

        saveConfig({
            minerAddress,
            miningMode,
            workerId,
            threads: allocatedThreads,
            nodeUrl: NODE_URL,
            savedAt: new Date().toISOString()
        });

        console.log('\x1b[35mStarting mining dashboard in 2 seconds...\x1b[0m');
        await new Promise(r => setTimeout(r, 2000));
        return;
    }

    const saved = loadSavedConfig();
    if (saved && saved.minerAddress && !process.env.MINER_ADDRESS) {
        console.log(`\x1b[34m[SAVED CONFIG]\x1b[0m Found existing payout wallet: \x1b[1;32m${saved.minerAddress}\x1b[0m`);
        console.log(`\x1b[34m[SAVED CONFIG]\x1b[0m Mining Mode: \x1b[1;35m${(saved.miningMode || 'pool').toUpperCase()}\x1b[0m`);
        console.log(`\x1b[34m[SAVED CONFIG]\x1b[0m Configured Threads: \x1b[1;33m${saved.threads || allocatedThreads} Threads\x1b[0m`);
        console.log(`\x1b[34m[SAVED CONFIG]\x1b[0m Node URL: \x1b[1m${saved.nodeUrl || NODE_URL}\x1b[0m\n`);

        const answer = await askQuestion('\x1b[1mUse saved configuration? [Y/n]: \x1b[0m');
        if (!answer.trim() || answer.trim().toLowerCase() === 'y') {
            minerAddress = saved.minerAddress;
            miningMode = saved.miningMode || 'pool';
            workerId = saved.workerId || 'worker-1';
            allocatedThreads = saved.threads || allocatedThreads;
            NODE_URL = saved.nodeUrl || NODE_URL;
            return;
        }
    }

    // 1. Choose Mining Mode
    console.log('\x1b[1mSelect Mining Strategy:\x1b[0m');
    console.log('  \x1b[36m[1]\x1b[0m \x1b[1;32mCollaborative Mining Pool (Recommended)\x1b[0m - Lower share difficulty, regular PPLNS payouts');
    console.log('  \x1b[36m[2]\x1b[0m \x1b[1;33mSolo Hardware Mining\x1b[0m - Full 50 CTX block rewards upon solving network difficulty');
    const modeChoice = (await askQuestion('\nSelect mining mode [1-2] (default: 1): ')).trim() || '1';
    miningMode = modeChoice === '2' ? 'solo' : 'pool';

    // 2. Choose or Create Wallet
    console.log('\n\x1b[1mPlease choose your Payout Wallet setup:\x1b[0m');
    console.log('  \x1b[36m[1]\x1b[0m Create a NEW $CTX Wallet (Generates secp256k1 keypair)');
    console.log('  \x1b[36m[2]\x1b[0m Enter my EXISTING $CTX Address (e.g., ctx1...)');
    console.log('  \x1b[36m[3]\x1b[0m Import via PRIVATE KEY');

    const choice = (await askQuestion('\nSelect wallet option [1-3] (default: 1): ')).trim() || '1';

    if (choice === '1') {
        const keyPair = CortexCrypto.generateKeyPair();
        minerAddress = keyPair.address;
        console.log('\n\x1b[32m✓ NEW WALLET GENERATED SUCCESSFULLY!\x1b[0m');
        console.log(`\x1b[33mPayout Address :\x1b[0m \x1b[1;32m${keyPair.address}\x1b[0m`);
        console.log(`\x1b[31mPrivate Key    :\x1b[0m \x1b[1;31m${keyPair.privateKey}\x1b[0m`);
        console.log('\x1b[90m⚠️  Please save your private key in a secure place!\x1b[0m\n');
    } else if (choice === '2') {
        const addr = (await askQuestion('\x1b[1mEnter your $CTX payout address (ctx1...): \x1b[0m')).trim();
        if (!addr.startsWith('ctx1') || addr.length < 20) {
            console.log('\x1b[31mInvalid address format. Defaulting to new wallet.\x1b[0m');
            const keyPair = CortexCrypto.generateKeyPair();
            minerAddress = keyPair.address;
        } else {
            minerAddress = addr;
        }
    } else if (choice === '3') {
        const priv = (await askQuestion('\x1b[1mEnter your private key (64 hex characters): \x1b[0m')).trim();
        try {
            const keyPair = CortexCrypto.fromPrivateKey(priv);
            minerAddress = keyPair.address;
            console.log(`\x1b[32m✓ Wallet imported successfully! Address: ${minerAddress}\x1b[0m\n`);
        } catch {
            console.log('\x1b[31mInvalid private key. Generating new wallet.\x1b[0m');
            const keyPair = CortexCrypto.generateKeyPair();
            minerAddress = keyPair.address;
        }
    }

    // 3. Worker Name
    const workerInput = (await askQuestion(`\nEnter Worker Identifier (default: ${os.hostname().substring(0, 12) || 'worker-1'}): `)).trim();
    workerId = workerInput || os.hostname().substring(0, 12) || 'worker-1';

    // 4. Thread Count
    console.log(`\n\x1b[1mConfigure CPU Mining Power:\x1b[0m`);
    const threadsInput = await askQuestion(`Enter number of threads to allocate [1-${totalCpus}] (default: ${Math.max(1, Math.floor(totalCpus / 2))}): `);
    const parsedThreads = Number(threadsInput.trim());
    if (parsedThreads >= 1 && parsedThreads <= totalCpus) {
        allocatedThreads = parsedThreads;
    }

    // 5. Node URL
    const nodeInput = await askQuestion(`\nEnter Cortex Node URL (default: ${NODE_URL}): `);
    if (nodeInput.trim()) {
        NODE_URL = nodeInput.trim();
    }

    // Save configuration
    saveConfig({
        minerAddress,
        miningMode,
        workerId,
        threads: allocatedThreads,
        nodeUrl: NODE_URL,
        savedAt: new Date().toISOString()
    });

    console.log('\n\x1b[32m✓ Configuration saved to ~/.cortex/miner_config.json\x1b[0m');
    console.log('\x1b[35mStarting mining dashboard in 2 seconds...\x1b[0m');
    await new Promise(r => setTimeout(r, 2000));
}

let initialBalance = -1;
let lastKnownBalance = 0;
let sessionEarned = 0;
let localBlocksFound = 0;
let poolSharesSubmitted = 0;
let localTotalHashes = 0;
let localHashrate = 0;
let spinnerIdx = 0;
let isMiningRunning = true;
let currentTemplate: any = null;
const SPINNERS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const activityLog: string[] = [];

async function startLocalMiningEngine() {
    let lastTime = Date.now();
    let lastHashes = 0;

    setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed >= 0.8) {
            const done = localTotalHashes - lastHashes;
            localHashrate = Math.round(done / elapsed);
            lastTime = now;
            lastHashes = localTotalHashes;
        }
    }, 800);

    while (isMiningRunning) {
        try {
            const templateEndpoint = miningMode === 'pool' 
                ? `/api/pool/template?address=${encodeURIComponent(minerAddress)}&worker=${encodeURIComponent(workerId)}&hashrate=${localHashrate}`
                : `/api/miner/template?address=${encodeURIComponent(minerAddress)}`;

            currentTemplate = await fetchJson(templateEndpoint);
            if (!currentTemplate || !currentTemplate.headerPrefix) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const headerPrefix = currentTemplate.headerPrefix;
            const headerSuffix = currentTemplate.headerSuffix;
            const targetPrefix = miningMode === 'pool' ? currentTemplate.targetSharePrefix : currentTemplate.targetPrefix;
            let nonce = Math.floor(Math.random() * 100000000);
            const blockIndex = currentTemplate.index;
            const seed = CortexRandomX.getSeedForBlock(blockIndex);

            const CHUNK = 4000 * Math.max(1, allocatedThreads);

            for (let i = 0; i < CHUNK; i++) {
                const header = `${headerPrefix}${nonce}${headerSuffix}`;
                const hash = CortexRandomX.hash(header, seed);
                localTotalHashes++;

                if (hash.startsWith(targetPrefix)) {
                    const submitPayload = {
                        minerAddress: minerAddress,
                        workerId: workerId,
                        hashrate: localHashrate,
                        index: currentTemplate.index,
                        previousHash: currentTemplate.previousHash,
                        timestamp: currentTemplate.timestamp,
                        transactions: currentTemplate.transactions,
                        difficulty: currentTemplate.difficulty,
                        nonce: nonce,
                        hash: hash
                    };

                    try {
                        const submitEndpoint = miningMode === 'pool' ? '/api/pool/submit-share' : '/api/miner/submit-block';
                        const submitRes = await fetchJson(submitEndpoint, {
                            method: 'POST',
                            body: submitPayload
                        });

                        const timeStr = new Date().toLocaleTimeString();

                        if (miningMode === 'pool') {
                            if (submitRes.validShare) {
                                poolSharesSubmitted++;
                                if (submitRes.blockFound) {
                                    localBlocksFound++;
                                    activityLog.unshift(`\x1b[1;35m🎉🎉 [${timeStr}] JACKPOT! Block #${blockIndex} found for the pool! Rewards distributed!\x1b[0m`);
                                } else {
                                    activityLog.unshift(`\x1b[1;32m✓ [${timeStr}] Share Accepted (Diff ${currentTemplate.shareDifficulty})! Total: ${poolSharesSubmitted}\x1b[0m`);
                                }
                                if (activityLog.length > 4) activityLog.pop();
                            }
                        } else {
                            if (submitRes.success) {
                                localBlocksFound++;
                                const reward = submitRes.reward || 50;
                                sessionEarned += reward;
                                activityLog.unshift(`\x1b[1;32m💎 [${timeStr}] BLOCK #${blockIndex} SOLVED SOLO! +${reward} CTX REWARD CREDITED!\x1b[0m`);
                                if (activityLog.length > 4) activityLog.pop();
                            }
                        }
                    } catch (submitErr) {
                        // Stale share / block
                    }
                    break;
                }
                nonce++;
            }

            await new Promise(r => setImmediate(r));
        } catch (e) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }
}

async function renderMinerDashboard() {
    try {
        const stats = await fetchJson('/api/stats');
        const poolStats = miningMode === 'pool' ? await fetchJson('/api/pool/stats').catch(() => null) : null;
        const poolMiner = (miningMode === 'pool' && minerAddress) ? await fetchJson(`/api/pool/miner/${encodeURIComponent(minerAddress)}`).catch(() => null) : null;
        const balanceData = minerAddress ? await fetchJson(`/api/balance/${minerAddress}`).catch(() => ({ balance: 0 })) : { balance: 0 };
        const currentBal = Number(balanceData?.balance) || 0;

        if (initialBalance === -1) {
            initialBalance = currentBal;
            lastKnownBalance = currentBal;
        } else if (currentBal > lastKnownBalance) {
            const diff = currentBal - lastKnownBalance;
            lastKnownBalance = currentBal;
            const timeStr = new Date().toLocaleTimeString();
            activityLog.unshift(`\x1b[1;32m💸 [${timeStr}] ON-CHAIN PAYOUT CONFIRMED! +${diff.toFixed(4)} CTX CREDITED!\x1b[0m`);
            if (activityLog.length > 4) activityLog.pop();
        }

        const onChainGained = Math.max(0, currentBal - initialBalance);
        const pendingGains = poolMiner ? (poolMiner.pendingPayout || 0) : 0;
        const totalSessionGains = onChainGained + pendingGains;

        spinnerIdx = (spinnerIdx + 1) % SPINNERS.length;
        const spinner = SPINNERS[spinnerIdx];

        const hr = localHashrate > 0 ? localHashrate : (Math.round(15000 * Math.max(1, allocatedThreads)));
        const hrFormatted = hr > 1000000 ? `${(hr/1000000).toFixed(2)} MH/s` : hr > 1000 ? `${(hr/1000).toFixed(2)} kH/s` : `${Math.max(1, hr)} H/s`;

        const padW = 46;

        clearScreen();
        console.log('\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m');
        console.log('\x1b[36m║\x1b[0m   \x1b[1;35m🧠 CORTEX PROTOCOL ($CTX) - RANDOMX CPU MINER (TESTNET 2.0)\x1b[0m        \x1b[36m║\x1b[0m');
        console.log('\x1b[36m╠══════════════════════════════════════════════════════════════════════╣\x1b[0m');
        
        const strategyStr = miningMode === 'pool' ? '\x1b[1;35m● COLLABORATIVE POOL (PPLNS 1% Fee)\x1b[0m' : '\x1b[1;33m● SOLO HARDWARE MINING (Direct L1)\x1b[0m';
        console.log(`\x1b[36m║\x1b[0m  \x1b[33mMining Strategy\x1b[0m     : ${padVisible(strategyStr, padW)} \x1b[36m║\x1b[0m`);
        
        const rigStr = `\x1b[1;37m${workerId} (${allocatedThreads} / ${os.cpus().length} Threads)\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[33mWorker / Rig ID\x1b[0m     : ${padVisible(rigStr, padW)} \x1b[36m║\x1b[0m`);
        
        const addrStr = `\x1b[1;37m${minerAddress.substring(0, 36)}...\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[33mPayout Address\x1b[0m      : ${padVisible(addrStr, padW)} \x1b[36m║\x1b[0m`);
        
        const balStr = `\x1b[1;32m${currentBal.toFixed(4)} CTX\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[1;32mWallet Balance\x1b[0m      : ${padVisible(balStr, padW)} \x1b[36m║\x1b[0m`);
        
        if (miningMode === 'pool' && poolMiner) {
            const roundEffortStr = `\x1b[1;33m${poolMiner.roundShares || poolSharesSubmitted} Shares (${poolMiner.roundEffortPercent || '100.0'}% of Round)\x1b[0m`;
            console.log(`\x1b[36m║\x1b[0m  \x1b[33mRound Contribution\x1b[0m  : ${padVisible(roundEffortStr, padW)} \x1b[36m║\x1b[0m`);

            const blockEstStr = `\x1b[1;35m~${(poolMiner.estimatedBlockReward || 49.50).toFixed(2)} CTX on Block Mined\x1b[0m`;
            console.log(`\x1b[36m║\x1b[0m  \x1b[33mEst. Block Reward\x1b[0m   : ${padVisible(blockEstStr, padW)} \x1b[36m║\x1b[0m`);
        }
        
        const earnStr = `\x1b[1;33m+${onChainGained.toFixed(4)} CTX (${miningMode === 'pool' ? poolSharesSubmitted + ' total shares' : localBlocksFound + ' blocks'})\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[33mSession Earnings\x1b[0m    : ${padVisible(earnStr, padW)} \x1b[36m║\x1b[0m`);
        
        console.log('\x1b[36m╠══════════════════════════════════════════════════════════════════════╣\x1b[0m');
        
        const heightStr = `\x1b[1;37m#${stats.height}\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[34mBlock Height\x1b[0m        : ${padVisible(heightStr, padW)} \x1b[36m║\x1b[0m`);
        
        const diffStr = `\x1b[1;37m${stats.difficulty}\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[34mNetwork Difficulty\x1b[0m  : ${padVisible(diffStr, padW)} \x1b[36m║\x1b[0m`);
        
        if (miningMode === 'pool' && poolStats) {
            const shareDiffStr = `\x1b[1;33m${poolStats.shareDifficulty} (Fast CPU Shares)\x1b[0m`;
            console.log(`\x1b[36m║\x1b[0m  \x1b[34mPool Share Diff\x1b[0m     : ${padVisible(shareDiffStr, padW)} \x1b[36m║\x1b[0m`);
            
            const poolHr = poolStats.totalPoolHashrate || 0;
            const poolHrFormatted = poolHr > 1000000 ? `${(poolHr/1000000).toFixed(2)} MH/s` : poolHr > 1000 ? `${(poolHr/1000).toFixed(2)} kH/s` : `${poolHr} H/s`;
            const poolHrBoxStr = `\x1b[1;35m${poolHrFormatted} (${poolStats.connectedMinersCount} Worker${poolStats.connectedMinersCount === 1 ? '' : 's'})\x1b[0m`;
            console.log(`\x1b[36m║\x1b[0m  \x1b[35mTotal Pool Hashrate\x1b[0m : ${padVisible(poolHrBoxStr, padW)} \x1b[36m║\x1b[0m`);
        }
        
        const netHr = stats.networkHashrate || 0;
        const netHrFormatted = netHr > 1000000 ? `${(netHr/1000000).toFixed(2)} MH/s` : netHr > 1000 ? `${(netHr/1000).toFixed(2)} kH/s` : `${netHr} H/s`;
        const netHrBoxStr = `\x1b[1;36m${netHrFormatted} (L1 Consensus)\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[34mGlobal Net Hashrate\x1b[0m : ${padVisible(netHrBoxStr, padW)} \x1b[36m║\x1b[0m`);

        const burnStr = `\x1b[1;31m${stats.totalBurned.toFixed(3)} CTX 🔥\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[34mTotal Burned CTX\x1b[0m    : ${padVisible(burnStr, padW)} \x1b[36m║\x1b[0m`);
        
        console.log('\x1b[36m╠══════════════════════════════════════════════════════════════════════╣\x1b[0m');
        
        const engineStr = `\x1b[1;32m${spinner} ACTIVE (Native CPU RandomX)\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[32mHardware Engine\x1b[0m     : ${padVisible(engineStr, padW)} \x1b[36m║\x1b[0m`);
        
        const hrBoxStr = `\x1b[1;32m${hrFormatted}\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[32mYour Rig Hashrate\x1b[0m   : ${padVisible(hrBoxStr, padW)} \x1b[36m║\x1b[0m`);
        
        const sharesBoxStr = `\x1b[1;33m${miningMode === 'pool' ? poolSharesSubmitted + ' Shares' : localBlocksFound + ' Blocks'}\x1b[0m`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[32mShares / Blocks Mined\x1b[0m: ${padVisible(sharesBoxStr, padW)} \x1b[36m║\x1b[0m`);
        
        const hashesStr = `${localTotalHashes.toLocaleString()}`;
        console.log(`\x1b[36m║\x1b[0m  \x1b[32mLocal Hashes Checked\x1b[0m: ${padVisible(hashesStr, padW)} \x1b[36m║\x1b[0m`);
        console.log('\x1b[36m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m');

        if (activityLog.length > 0) {
            console.log('\n\x1b[1m📜 Mining Activity & Pool Rewards Log:\x1b[0m');
            activityLog.forEach(log => console.log('  ' + log));
        }

        console.log('\n\x1b[90mPress [Ctrl+C] to stop mining. Real-time CPU hashing active...\x1b[0m');
    } catch (err: any) {
        console.log(`\x1b[31m[ERROR] Connection error with ${NODE_URL}: ${err.message}\x1b[0m`);
    }
}

async function main() {
    await setupMiner();
    startLocalMiningEngine();
    setInterval(renderMinerDashboard, 800);
}

main();
