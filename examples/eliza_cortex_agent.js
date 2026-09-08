/**
 * Cortex Protocol ($CTX) x ElizaOS Integration Demo
 * Autonomous agent leveraging Cortex L1 for sovereign identity,
 * decentralized memory inscription, and on-chain state anchoring.
 */

const { cortexPlugin, CortexService } = require('../packages/plugin-cortex/dist');

// Master Funded Testnet Agent Key (Treasury Key)
const MASTER_TESTNET_KEY = '4a7f92b938471029384710293847102938471029384710293847102938471029';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runElizaAgentDemo() {
    console.log('\n' + '='.repeat(80));
    console.log('🤖 ELIZAOS AUTONOMOUS AGENT x CORTEX PROTOCOL ($CTX) INTEGRATION');
    console.log('   Layer-1 Decentralized Memory & Sovereign secp256k1 Settlement');
    console.log('='.repeat(80) + '\n');

    // 1. Initialize Mock ElizaOS Agent Runtime
    const nodeUrl = process.env.CORTEX_NODE_URL || 'https://cortex-protocol.xyz';
    // Use configured or master funded testnet key for instant demonstration
    const agentKey = process.env.CORTEX_PRIVATE_KEY || MASTER_TESTNET_KEY;
    const cortexService = new CortexService(nodeUrl, agentKey);
    const keyPair = cortexService.getKeyPair();

    console.log(`[1] ElizaOS Agent Initialized:`);
    console.log(`    - Agent Name:     Eliza-Cortex-Oracle`);
    console.log(`    - Connected Node: ${nodeUrl}`);
    console.log(`    - Sovereign Addr: ${keyPair.address}`);
    console.log(`    - secp256k1 Pub:  ${keyPair.publicKey.substring(0, 32)}...`);

    const mockRuntime = {
        agentId: 'eliza-cortex-oracle-001',
        character: {
            name: 'Eliza-Cortex-Oracle',
            bio: 'Autonomous intelligence anchoring verified knowledge onto Cortex Layer-1 PoW blockchain.'
        },
        getService: (name) => {
            if (name === 'cortex') return cortexService;
            return undefined;
        }
    };

    // 2. Query Wallet Provider (Prompt Context Injection)
    console.log(`\n[2] Executing cortexWalletProvider (Injecting Prompt Context)...`);
    const walletProvider = cortexPlugin.providers?.[0];
    if (walletProvider) {
        const dummyMsg = { content: { text: 'status check' } };
        const promptContext = await walletProvider.get(mockRuntime, dummyMsg);
        console.log('--- Injected Prompt Context ---');
        console.log(promptContext);
        console.log('-------------------------------');
    }

    // 3. Check Balance
    console.log(`\n[3] Checking Agent Balance...`);
    let balance = await cortexService.getBalance();
    console.log(`    - Confirmed Balance: ${balance.confirmed.toFixed(4)} CTX`);

    if (balance.confirmed < 0.05) {
        console.log(`    -> Requesting 5.00 Testnet $CTX from Network Faucet...`);
        try {
            const faucetRes = await cortexService.claimFaucet();
            console.log(`    ✓ Faucet Claim Broadcasted! TxID: ${faucetRes.txId}`);
            console.log(`    ⏳ Waiting for next PoW block to confirm faucet UTXO...`);
            for (let i = 0; i < 30; i++) {
                await sleep(3000);
                balance = await cortexService.getBalance();
                if (balance.confirmed >= 0.05) {
                    console.log(`    ✓ Block Confirmed! Available Balance: ${balance.confirmed.toFixed(4)} CTX`);
                    break;
                }
            }
        } catch (e) {
            console.log(`    ℹ Faucet Notice: ${e.message}`);
        }
    }

    // 4. Autonomous Memory Inscription (INSCRIBE_MEMORY Action)
    console.log(`\n[4] Simulating Autonomous Cognitive Milestone & State Commitment...`);
    const inscribeAction = cortexPlugin.actions?.find(a => a.name === 'INSCRIBE_MEMORY');
    
    if (inscribeAction) {
        const memoryContent = `ElizaOS Autonomous Agent Oracle verified zero-knowledge invariant for Neural Consensus Protocol. Vector commitment anchored at block timestamp ${Date.now()}.`;
        const memoryMessage = {
            content: {
                text: memoryContent
            }
        };

        console.log(`    - Inscribing Memory: "${memoryContent}"`);
        console.log(`    - Topic: elizaos_neural_consensus`);
        console.log(`    - Broadcasting to Cortex L1 PoW Network...`);

        try {
            const result = await inscribeAction.handler(
                mockRuntime,
                memoryMessage,
                undefined,
                {
                    topic: 'elizaos_neural_consensus',
                    content: memoryContent,
                    memoryType: 'KNOWLEDGE_BASE'
                },
                async (res) => {
                    console.log(`\n    🎯 Callback Received from CortexPlugin:`);
                    console.log(`       ${res.text.split('\n').join('\n       ')}`);
                }
            );
            console.log(`\n    ✓ Memory successfully broadcasted! TxID: ${result.txId}`);
            console.log(`    🔗 Live Tx Inspector: ${nodeUrl}/api/transaction/${result.txId}`);
        } catch (err) {
            console.error(`    ❌ Inscription error: ${err.message}`);
        }
    }

    // 5. Query Recent On-Chain Memories (cortexMemoryProvider)
    console.log(`\n[5] Executing cortexMemoryProvider (Decentralized On-Chain RAG)...`);
    const memoryProvider = cortexPlugin.providers?.[1];
    if (memoryProvider) {
        const queryMsg = { content: { text: 'neural consensus' } };
        const recalledContext = await memoryProvider.get(mockRuntime, queryMsg);
        if (recalledContext) {
            console.log('--- Recalled On-Chain Knowledge (RAG) ---');
            console.log(recalledContext);
            console.log('-----------------------------------------');
        } else {
            console.log('    ℹ Waiting for community miners to seal memory in next block.');
        }
    }

    // 6. Network Confirmation Notice
    const stats = await cortexService.getStats();
    console.log(`\n[6] Cortex Network Status:`);
    console.log(`    - Latest Block: #${stats.blockHeight}`);
    console.log(`    - PoW Difficulty: ${stats.difficulty}`);
    console.log(`    - Mempool Pending Txs: ${stats.pendingMempool}`);
    console.log(`\n✨ ElizaOS Agent is fully coupled with Cortex Protocol Layer-1!`);
    console.log(`   Explorer Link: ${nodeUrl}\n`);
}

runElizaAgentDemo().catch(console.error);
