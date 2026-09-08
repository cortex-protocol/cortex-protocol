import { Evaluator, IAgentRuntime, Memory, State } from '../types';
import { CortexService } from '../service';

export const cortexAutoAnchorEvaluator: Evaluator = {
    name: 'CORTEX_AUTO_ANCHOR',
    similes: ['AUTO_SAVE_MEMORY', 'ANCHOR_LEARNING', 'RECORD_INSIGHT'],
    description: 'Automatically analyzes agent interactions and permanently anchors novel facts, agreements, or high-value insights onto the Cortex L1 blockchain.',
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const text = message.content?.text || '';
        // Only evaluate on substantive responses (e.g. key decisions, agreements, or structured facts)
        const triggers = ['agreed', 'decision', 'learned', 'strategy', 'contract', 'milestone', 'summary', 'confirmed'];
        return text.length > 50 && triggers.some(t => text.toLowerCase().includes(t));
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State, options?: Record<string, any>) => {
        try {
            const service: CortexService = (runtime.getService && runtime.getService('cortex')) || new CortexService();
            const agentId = runtime.character?.name || 'Eliza-Cortex-Agent';
            const text = message.content.text;

            // Automatically inscribe as EPISODIC insight
            const result = await service.inscribeMemory({
                agentId,
                topic: 'autonomous_cognitive_milestone',
                content: text.substring(0, 500),
                memoryType: 'EPISODIC',
                fee: 0.05
            });

            return {
                anchored: true,
                txId: result.txId,
                vectorHash: result.vectorHash
            };
        } catch (err: any) {
            return {
                anchored: false,
                error: err.message
            };
        }
    },
    examples: [
        {
            context: 'The user and agent finalize a decentralized partnership agreement.',
            messages: [
                {
                    user: '{{user1}}',
                    content: { text: 'So we have agreed to deploy the liquidity pool tomorrow at 14:00 UTC.' }
                }
            ],
            outcome: 'The agent automatically commits this milestone agreement to Cortex Protocol L1 with a cryptographic state hash.'
        }
    ]
};
