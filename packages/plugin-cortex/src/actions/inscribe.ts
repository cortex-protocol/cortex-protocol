import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '../types';
import { CortexService } from '../service';

export const inscribeMemoryAction: Action = {
    name: 'INSCRIBE_MEMORY',
    similes: [
        'STORE_MEMORY',
        'COMMIT_MEMORY',
        'ANCHOR_MEMORY',
        'SAVE_TO_CORTEX',
        'RECORD_ON_CHAIN'
    ],
    description: 'Permanently inscribe an important fact, decision, or memory onto the Cortex Protocol Layer-1 PoW blockchain.',
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        return !!message.content.text;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: Record<string, any>,
        callback?: HandlerCallback
    ) => {
        try {
            const service: CortexService = (runtime.getService && runtime.getService('cortex')) || new CortexService();
            const agentId = runtime.character?.name || 'Eliza-Cortex-Agent';

            // Extract topic and content
            let topic = options?.topic || 'agent_conversation';
            let content = options?.content || message.content.text;
            let memoryType: 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL' | 'KNOWLEDGE_BASE' = options?.memoryType || 'EPISODIC';

            // Check if agent balance is sufficient, auto-claim faucet if empty
            const bal = await service.getBalance();
            if (bal.total < 0.05) {
                try {
                    await service.claimFaucet();
                } catch (e) {
                    // Faucet may be on cooldown, continue
                }
            }

            const result = await service.inscribeMemory({
                agentId,
                topic,
                content,
                memoryType,
                fee: 0.05
            });

            const replyText = `[Cortex L1 Memory Inscribed]\n- TxID: ${result.txId}\n- Vector Hash: ${result.vectorHash.substring(0, 16)}...\n- Topic: ${topic}\n- Block Status: PENDING (Broadcasted to PoW Miners)`;

            if (callback) {
                await callback({
                    text: replyText,
                    action: 'INSCRIBE_MEMORY',
                    content: {
                        txId: result.txId,
                        vectorHash: result.vectorHash,
                        topic,
                        agentAddress: service.getAddress()
                    }
                });
            }

            return result;
        } catch (error: any) {
            const errorMsg = `Failed to inscribe memory on Cortex: ${error.message}`;
            if (callback) {
                await callback({
                    text: errorMsg,
                    action: 'INSCRIBE_MEMORY_FAILED',
                    content: { error: error.message }
                });
            }
            throw error;
        }
    },
    examples: [
        [
            {
                user: '{{user1}}',
                content: { text: 'Please record this agreement to the blockchain: We agreed on a 70/30 revenue share for project Alpha.' }
            },
            {
                user: '{{agentName}}',
                content: {
                    text: 'Inscribing our 70/30 revenue share agreement to Cortex Protocol Layer-1 ledger...',
                    action: 'INSCRIBE_MEMORY'
                }
            }
        ]
    ]
};
