/**
 * Cortex Protocol ($CTX) x ElizaOS Integration Demo
 * Demonstrates an autonomous Eliza agent leveraging Cortex L1 for sovereign identity,
 * decentralized memory inscription, and on-chain state anchoring.
 */

import { cortexPlugin, CortexService } from '../packages/plugin-cortex/src';
import { IAgentRuntime, Memory } from '../packages/plugin-cortex/src/types';

async function runElizaAgentDemo() {
    console.log('\n' + '='.repeat(80));
    console.log('🤖 ELIZAOS AUTONOMOUS AGENT x CORTEX PROTOCOL ($CTX) INTEGRATION');
    console.log('   Layer-1 Decentralized Memory & Sovereign secp256k1 Settlement');
    console.log('='.repeat(80) + '\n');

    // 1. Initialize Mock ElizaOS Agent Runtime
    const nodeUrl = process.env.CORTEX_NODE_URL || 'https://cortex-protocol.xyz';
    const cortexService = new CortexService(nodeUrl);
    const keyPair = cortexService.getKeyPair();

    console.log(`[1] ElizaOS Agent Initialized:`);
    console.log(`    - Agent Name:     Eliza-Cortex-Oracle`);
    console.log(`    - Connected Node: ${nodeUrl}`);
    console.log(`    - Sovereign Addr: ${keyPair.address}`);
    console.log(`    - secp256k1 Pub:  ${keyPair.publicKey.substring(0, 32)}...`);

    const mockRuntime: IAgentRuntime = {
        agentId: 'eliza-cortex-oracle-001',
        character: {
            name: 'Eliza-Cortex-Oracle',
            bio: 'Autonomous intelligence anchoring verified knowledge onto Cortex Layer-1 PoW blockchain.'
        },
        getService: (name: string) => {
            if (name === 'cortex') return cortexService;
            return undefined;
        }
    };

    // 2. Query Wallet Provider (Prompt Context Injection)
    console.log(`\n[2] Executing cortexWalletProvider (Injecting Prompt Context)...`);
    const walletProvider = cortexPlugin.providers?.find(p => p !== undefined);
    if (walletProvider) {
        const dummyMsg: Memory = { content: { text: 'status check' } };
        const promptContext = await walletProvider.get(mockRuntime, dummyMsg);
        console.log('--- Injected Prompt Context ---');
        console.log(promptContext);
        console.log('-------------------------------');
    }

    // 3. Check Initial Balance & Fund via Faucet if needed
    console.log(`\n[3] Checking Agent Balance...`);
    let balance = await cortexService.getBalance();
    console.log(`    - Current Balance: ${balance.total} CTX (Confirmed: ${balance.confirmed} CTX)`);

    if (balance.total < 0.05) {
        console.log(`    -> Requesting 5.00 Testnet $CTX from Network Faucet...`);
        try {
            const faucetRes = await cortexService.claimFaucet();
            console.log(`    ✓ Faucet Claim Successful! TxID: ${faucetRes.txId}`);
        } catch (e: any) {
            console.log(`    ℹ Faucet Notice: ${e.message}`);
        }
    }

    // 4. Autonomous Memory Inscription (INSCRIBE_MEMORY Action)
    console.log(`\n[4] Simulating Autonomous Cognitive Milestone & State Commitment...`);
    const inscribeAction = cortexPlugin.actions?.find(a => a.name === 'INSCRIBE_MEMORY');
    
    if (inscribeAction) {
        const memoryContent = `Synthesized cross-entropy reasoning proof for Multi-Agent Consensus Protocol (MACP-7). Mathematical invariant validated across 128 distributed nodes. Zero state divergence.`;
        const memoryMessage: Memory = {
            content: {
                text: memoryContent
            }
        };

        console.log(`    - Inscribing Memory: "${memoryContent}"`);
        console.log(`    - Topic: multi_agent_consensus_proof`);
        console.log(`    - Broadcasting to Cortex L1 PoW Network...`);

        try {
            await inscribeAction.handler(
                mockRuntime,
                memoryMessage,
                undefined,
                {
                    topic: 'multi_agent_consensus_proof',
                    content: memoryContent,
                    memoryType: 'KNOWLEDGE_BASE'
                },
                async (res) => {
                    console.log(`\n    🎯 Callback Received from CortexPlugin:`);
                    console.log(`       ${res.text.split('\n').join('\n       ')}`);
                }
            );
        } catch (err: any) {
            console.error(`    ❌ Inscription error: ${err.message}`);
        }
    }

    // 5. Query Recent On-Chain Memories (cortexMemoryProvider)
    console.log(`\n[5] Executing cortexMemoryProvider (Decentralized On-Chain RAG)...`);
    const memoryProvider = cortexPlugin.providers?.[1];
    if (memoryProvider) {
        const queryMsg: Memory = { content: { text: 'consensus proof' } };
        const recalledContext = await memoryProvider.get(mockRuntime, queryMsg);
        if (recalledContext) {
            console.log('--- Recalled On-Chain Knowledge (RAG) ---');
            console.log(recalledContext);
            console.log('-----------------------------------------');
        } else {
            console.log('    ℹ Waiting for next block to seal new memory into immutable storage.');
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
