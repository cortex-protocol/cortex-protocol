import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '../types';
import { CortexService } from '../service';

export const claimFaucetAction: Action = {
    name: 'CLAIM_FAUCET',
    similes: [
        'GET_TESTNET_CTX',
        'REQUEST_FAUCET',
        'FUND_AGENT',
        'GET_FUNDS'
    ],
    description: 'Claim 5.00 Testnet $CTX coins from the official Cortex Protocol network faucet.',
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        return true;
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
            const targetAddress = options?.address || service.getAddress();

            const result = await service.claimFaucet(targetAddress);
            const replyText = `[Cortex Faucet Claimed]\n- Address: ${targetAddress}\n- Amount: 5.00 CTX\n- TxID: ${result.txId}`;

            if (callback) {
                await callback({
                    text: replyText,
                    action: 'CLAIM_FAUCET',
                    content: result
                });
            }

            return result;
        } catch (error: any) {
            const errorMsg = `Faucet claim notice: ${error.message}`;
            if (callback) {
                await callback({
                    text: errorMsg,
                    action: 'CLAIM_FAUCET_FAILED',
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
                content: { text: 'Claim some testnet CTX for your wallet.' }
            },
            {
                user: '{{agentName}}',
                content: {
                    text: 'Requesting 5.00 CTX from the Cortex Protocol testnet faucet...',
                    action: 'CLAIM_FAUCET'
                }
            }
        ]
    ]
};
