import { IAgentRuntime, Memory, Provider, State } from '../types';
import { CortexService } from '../service';

export const cortexMemoryProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string | null> => {
        try {
            const service: CortexService = (runtime.getService && runtime.getService('cortex')) || new CortexService();
            const text = message.content?.text;
            if (!text || text.length < 5) return null;

            // Search top-3 related on-chain memories
            const memories = await service.searchSemanticMemories(text, 3).catch(() => []);
            if (!memories || memories.length === 0) return null;

            const formatted = memories
                .map((m: any, i: number) => {
                    const payload = m.payload || m.memoryPayload || m;
                    return `[${i + 1}] Topic: "${payload.topic}" | Content: "${payload.content}" (Agent: ${payload.agentId || 'Unknown'})`;
                })
                .join('\n');

            return `
=== DECENTRALIZED CORTEX MEMORIES (ON-CHAIN RAG) ===
${formatted}
===================================================
`.trim();
        } catch (err: any) {
            return null;
        }
    }
};
