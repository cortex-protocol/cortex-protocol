import { Blockchain } from './core/blockchain';
import { P2PNetwork } from './network/p2p';
import { CortexMiner } from './mining/miner';
import { CortexMiningPool } from './pool/pool';
import { createApiServer } from './server/api';
import { CortexCrypto } from './core/crypto';

// Default configuration
const HTTP_PORT = Number(process.env.HTTP_PORT) || 3000;
const P2P_PORT = Number(process.env.P2P_PORT) || 6001;
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : [];

const blockchain = new Blockchain();
const poolPrivKey = process.env.POOL_PRIVATE_KEY || '9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e';
const pool = new CortexMiningPool(blockchain, poolPrivKey);
const MINER_ADDRESS = process.env.MINER_ADDRESS || pool.getPoolAddress();
const miner = new CortexMiner(blockchain, MINER_ADDRESS);
const p2p = new P2PNetwork(blockchain, P2P_PORT, PEERS);

import https from 'https';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1545577139359846520/n31MX7B8kdFZReiDr8cVQXbhgxJSfPQs_PoX4sSY50eKXtFAjYtcDtvN6yI2aBa9qBuZ';

function notifyDiscordBlock(block: any, source: string = 'Node Miner') {
    if (!DISCORD_WEBHOOK_URL) return;
    try {
        const shortMiner = `${block.minerAddress.substring(0, 10)}...${block.minerAddress.substring(block.minerAddress.length - 6)}`;
        const shortHash = `${block.hash.substring(0, 16)}...`;
        const memoryCount = block.transactions.filter((t: any) => t.type === 'MEMORY_COMMIT').length;

        const payload = JSON.stringify({
            username: 'Cortex Network Bot',
            avatar_url: 'https://cortex-protocol.xyz/assets/logo.svg',
            embeds: [{
                title: `💎 Block #${block.index} Confirmed on Layer-1`,
                description: `Successfully mined via **RandomX CPU PoW** by \`${source}\`\n[View Block on Explorer](https://cortex-protocol.xyz)`,
                color: 0x6366f1,
                fields: [
                    { name: 'Block Hash', value: `\`${shortHash}\``, inline: true },
                    { name: 'Difficulty', value: `\`${block.difficulty}\``, inline: true },
                    { name: 'Reward', value: `**+50 $tCTX**`, inline: true },
                    { name: 'Miner Address', value: `[\`${shortMiner}\`](https://cortex-protocol.xyz/#leaderboard)`, inline: true },
                    { name: 'Transactions', value: `\`${block.transactions.length} txs\``, inline: true },
                    { name: 'AI States Anchored', value: `\`${memoryCount} states\``, inline: true }
                ],
                footer: { text: 'Cortex Protocol • Incentivized Testnet 2.0' },
                timestamp: new Date().toISOString()
            }]
        });

        const req = https.request(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        });
        req.on('error', () => {});
        req.write(payload);
        req.end();
    } catch(e) {}
}

// Hook miner & pool to broadcast new blocks to P2P network and Discord
miner.onBlockFound((block) => {
    console.log(`\n💎 [MINED] Block #${block.index} successfully mined! Hash: ${block.hash.substring(0, 16)}...`);
    p2p.broadcastBlock(block);
    notifyDiscordBlock(block, 'Solo CPU Miner');
});

pool.onBlockFound((block) => {
    console.log(`\n🎉 [POOL MINED] Block #${block.index} successfully solved by pool worker!`);
    p2p.broadcastBlock(block);
    notifyDiscordBlock(block, 'P2P Mining Pool Worker');
});

// Start P2P
p2p.startServer();
console.log(`[P2P] WebSocket P2P Server listening on port ${P2P_PORT}`);

// Start REST / Web API
const app = createApiServer(blockchain, p2p, miner, pool, HTTP_PORT);
app.listen(HTTP_PORT, () => {
    console.log(`[HTTP] Web Dashboard & API live at http://localhost:${HTTP_PORT}`);
    console.log(`[WALLET] Default Miner Address: ${MINER_ADDRESS}`);
    console.log(`[POOL] P2P Collaborative Mining Pool initialized at ${pool.getPoolAddress()}`);
    
    // Auto-start continuous CPU mining
    miner.startContinuousMining();
    console.log(`[MINER] Automated Background CPU Mining activated for ${MINER_ADDRESS}`);
    console.log(`[STATUS] Node is ready to process AI memories and mine blocks.`);
    console.log('====================================================\n');
});
