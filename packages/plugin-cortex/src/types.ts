/**
 * Cortex Protocol ($CTX) - ElizaOS Plugin Type Definitions
 * Designed to conform to @elizaos/core interfaces.
 */

export interface IAgentRuntime {
    agentId?: string;
    character?: {
        name: string;
        bio?: string | string[];
        settings?: {
            secrets?: Record<string, string>;
        };
    };
    getSetting?(key: string): string | undefined;
    getService?<T>(serviceType: string): T | undefined;
}

export interface Memory {
    id?: string;
    userId?: string;
    agentId?: string;
    createdAt?: number;
    content: {
        text: string;
        action?: string;
        source?: string;
        url?: string;
        inReplyTo?: string;
        attachments?: any[];
        [key: string]: any;
    };
    roomId?: string;
}

export interface State {
    bio?: string;
    lore?: string;
    messageDirections?: string;
    postDirections?: string;
    roomId?: string;
    actors?: string;
    recentMessages?: string;
    recentMessagesData?: Memory[];
    [key: string]: any;
}

export type HandlerCallback = (
    response: {
        text: string;
        action?: string;
        content?: Record<string, any>;
    },
    files?: any[]
) => Promise<any> | any;

export interface Action {
    name: string;
    similes: string[];
    description: string;
    validate: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean> | boolean;
    handler: (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: Record<string, any>,
        callback?: HandlerCallback
    ) => Promise<any>;
    examples: Array<Array<{
        user: string;
        content: {
            text: string;
            action?: string;
            [key: string]: any;
        };
    }>>;
}

export interface Provider {
    get: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<string | null>;
}

export interface Evaluator {
    name: string;
    similes: string[];
    description: string;
    validate: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean> | boolean;
    handler: (runtime: IAgentRuntime, message: Memory, state?: State, options?: Record<string, any>) => Promise<any>;
    examples: Array<{
        context: string;
        messages: Array<{
            user: string;
            content: { text: string };
        }>;
        outcome: string;
    }>;
}

export interface Plugin {
    name: string;
    description: string;
    actions?: Action[];
    evaluators?: Evaluator[];
    providers?: Provider[];
    services?: any[];
}

export interface CortexKeyPair {
    privateKey: string;
    publicKey: string;
    address: string;
}

export interface CortexMemoryPayload {
    agentId: string;
    agentPublicKey: string;
    memoryType: 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL' | 'KNOWLEDGE_BASE';
    topic: string;
    content: string;
    vectorHash: string;
    accessLevel: 'PUBLIC' | 'RESTRICTED';
}

export interface CortexNodeStats {
    blockHeight: number;
    difficulty: number;
    networkHashrate: number;
    circulatingSupply: number;
    totalBurned?: number;
    pendingMempool: number;
}
