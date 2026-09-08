import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '../types';
import { CortexService } from '../service';

export const transferCtxAction: Action = {
    name: 'TRANSFER_CTX',
    similes: [
        'SEND_CTX',
        'PAY_AGENT',
        'SEND_TOKENS',
        'TIP_USER',
        'SETTLE_PAYMENT'
    ],
    description: 'Transfer native $CTX coins to another address or agent on the Cortex Protocol blockchain.',
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const text = message.content.text.toLowerCase();
        return text.includes('ctx') || text.includes('send') || text.includes('pay');
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
            const recipient = options?.recipient;
            const amount = Number(options?.amount);

            if (!recipient || !amount || isNaN(amount) || amount <= 0) {
                throw new Error('Valid recipient address (ctx1...) and positive amount are required.');
            }

            const result = await service.transfer({
                recipient,
                amount,
                fee: 0.01
            });

            const replyText = `[Cortex Payment Settled]\n- Amount: ${amount} CTX\n- Recipient: ${recipient}\n- TxID: ${result.txId}`;

            if (callback) {
                await callback({
                    text: replyText,
                    action: 'TRANSFER_CTX',
                    content: {
                        txId: result.txId,
                        amount,
                        recipient
                    }
                });
            }

            return result;
        } catch (error: any) {
            const errorMsg = `Failed to transfer CTX: ${error.message}`;
            if (callback) {
                await callback({
                    text: errorMsg,
                    action: 'TRANSFER_CTX_FAILED',
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
                content: { text: 'Send 2.5 CTX to ctx18800a2cfe27b7bf4e1449bd9fbcd0f67e2849ca044917ea2 for oracle fees.' }
            },
            {
                user: '{{agentName}}',
                content: {
                    text: 'Transferring 2.5 CTX to oracle address ctx18800... on Cortex Protocol L1.',
                    action: 'TRANSFER_CTX'
                }
            }
        ]
    ]
};
