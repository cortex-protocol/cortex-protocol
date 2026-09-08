import { Plugin } from './types';
import { inscribeMemoryAction } from './actions/inscribe';
import { transferCtxAction } from './actions/transfer';
import { claimFaucetAction } from './actions/faucet';
import { cortexWalletProvider } from './providers/wallet';
import { cortexMemoryProvider } from './providers/memory';
import { cortexAutoAnchorEvaluator } from './evaluators/autoAnchor';
import { CortexService } from './service';

export * from './types';
export * from './service';
export * from './actions/inscribe';
export * from './actions/transfer';
export * from './actions/faucet';
export * from './providers/wallet';
export * from './providers/memory';
export * from './evaluators/autoAnchor';

export const cortexPlugin: Plugin = {
    name: 'cortex-protocol',
    description: 'Official Cortex Protocol ($CTX) Plugin for ElizaOS – Sovereign Decentralized Memory, Knowledge Anchoring, and RandomX PoW Settlement for Autonomous AI Agents',
    actions: [
        inscribeMemoryAction,
        transferCtxAction,
        claimFaucetAction
    ],
    evaluators: [
        cortexAutoAnchorEvaluator
    ],
    providers: [
        cortexWalletProvider,
        cortexMemoryProvider
    ],
    services: [
        new CortexService()
    ]
};

export default cortexPlugin;
