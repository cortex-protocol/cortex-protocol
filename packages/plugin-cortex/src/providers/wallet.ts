import { IAgentRuntime, Memory, Provider, State } from '../types';
import { CortexService } from '../service';

export const cortexWalletProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string | null> => {
        try {
            const service: CortexService = (runtime.getService && runtime.getService('cortex')) || new CortexService();
            const address = service.getAddress();
            const [balance, stats] = await Promise.all([
                service.getBalance(address).catch(() => ({ confirmed: 0, total: 0, nonce: 0 })),
                service.getStats().catch(() => ({ blockHeight: 0, difficulty: 0, networkHashrate: 0 }))
            ]);

            return `
=== CORTEX PROTOCOL LAYER-1 CONTEXT ===
- Network Block Height: #${stats.blockHeight}
- Network PoW Difficulty: ${stats.difficulty}
- Agent Address: ${address}
- Available Balance: ${balance.total.toFixed(4)} CTX (Confirmed: ${balance.confirmed.toFixed(4)} CTX)
- Cryptographic Engine: secp256k1 sovereign identity
- Consensus Algorithm: RandomX (rx/0) PoW
=======================================
`.trim();
        } catch (err: any) {
            return null;
        }
    }
};
