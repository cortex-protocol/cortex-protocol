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

// Hook miner & pool to broadcast new blocks to P2P network
miner.onBlockFound((block) => {
    console.log(`\n💎 [MINED] Block #${block.index} successfully mined! Hash: ${block.hash.substring(0, 16)}...`);
    p2p.broadcastBlock(block);
});

pool.onBlockFound((block) => {
    console.log(`\n🎉 [POOL MINED] Block #${block.index} successfully solved by pool worker!`);
    p2p.broadcastBlock(block);
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
