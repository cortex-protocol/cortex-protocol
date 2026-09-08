import crypto from 'crypto';
import { ec as EC } from 'elliptic';
import { CortexKeyPair, CortexMemoryPayload, CortexNodeStats } from './types';

const ec = new EC('secp256k1');

export class CortexService {
    private nodeUrl: string;
    private keyPair: CortexKeyPair;

    constructor(nodeUrl?: string, privateKeyHex?: string) {
        this.nodeUrl = (nodeUrl || process.env.CORTEX_NODE_URL || 'https://cortex-protocol.xyz').replace(/\/$/, '');
        
        const key = privateKeyHex || process.env.CORTEX_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
        if (key && key.trim().length === 64) {
            this.keyPair = CortexService.fromPrivateKey(key.trim());
        } else {
            this.keyPair = CortexService.generateKeyPair();
        }
    }

    public getKeyPair(): CortexKeyPair {
        return this.keyPair;
    }

    public getAddress(): string {
        return this.keyPair.address;
    }

    public getNodeUrl(): string {
        return this.nodeUrl;
    }

    // --- CRYPTO UTILITIES ---

    public static sha256(data: string | Buffer): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    public static deriveAddress(publicKeyHex: string): string {
        const pubKeyHash = crypto.createHash('sha256').update(Buffer.from(publicKeyHex, 'hex')).digest();
        const ripemd = crypto.createHash('ripemd160').update(pubKeyHash).digest('hex');
        const checksum = crypto.createHash('sha256').update(crypto.createHash('sha256').update(ripemd).digest()).digest('hex').substring(0, 8);
        return `ctx1${ripemd}${checksum}`;
    }

    public static generateKeyPair(): CortexKeyPair {
        const key = ec.genKeyPair();
        const privateKey = key.getPrivate('hex').padStart(64, '0');
        const publicKey = key.getPublic(true, 'hex');
        const address = this.deriveAddress(publicKey);
        return { privateKey, publicKey, address };
    }

    public static fromPrivateKey(privateKeyHex: string): CortexKeyPair {
        const key = ec.keyFromPrivate(privateKeyHex, 'hex');
        const privateKey = key.getPrivate('hex').padStart(64, '0');
        const publicKey = key.getPublic(true, 'hex');
        const address = this.deriveAddress(publicKey);
        return { privateKey, publicKey, address };
    }

    // --- NODE API CALLS ---

    public async getStats(): Promise<CortexNodeStats> {
        const res = await fetch(`${this.nodeUrl}/api/stats`);
        if (!res.ok) throw new Error(`Failed to fetch Cortex node stats (${res.status})`);
        const data = await res.json() as any;
        return {
            blockHeight: data.blockHeight || data.height || 0,
            difficulty: data.difficulty || 0,
            networkHashrate: data.networkHashrate || 0,
            circulatingSupply: data.circulatingSupply || 0,
            totalBurned: data.totalBurned || 0,
            pendingMempool: data.pendingMempool || 0
        };
    }

    public async getBalance(address?: string): Promise<{ confirmed: number; total: number; nonce: number }> {
        const target = address || this.keyPair.address;
        const res = await fetch(`${this.nodeUrl}/api/balance/${target}`);
        if (!res.ok) throw new Error(`Failed to fetch balance for ${target} (${res.status})`);
        const data = await res.json() as any;
        return {
            confirmed: Number(data.confirmedBalance || 0),
            total: Number(data.balance || 0),
            nonce: Number(data.nonce || 0)
        };
    }

    public async claimFaucet(targetAddress?: string): Promise<{ txId: string; amount: number; message: string }> {
        const address = targetAddress || this.keyPair.address;
        const res = await fetch(`${this.nodeUrl}/api/faucet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });
        const data = await res.json() as any;
        if (!res.ok || data.error) {
            throw new Error(data.error || `Faucet request failed (${res.status})`);
        }
        return data;
    }

    public async inscribeMemory(params: {
        agentId: string;
        topic: string;
        content: string;
        memoryType?: 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL' | 'KNOWLEDGE_BASE';
        fee?: number;
    }): Promise<{ txId: string; vectorHash: string; payload: CortexMemoryPayload }> {
        const memoryType = params.memoryType || 'KNOWLEDGE_BASE';
        const fee = params.fee !== undefined ? params.fee : 0.05;

        const res = await fetch(`${this.nodeUrl}/api/memory/inscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentPrivateKey: this.keyPair.privateKey,
                agentId: params.agentId,
                topic: params.topic,
                content: params.content,
                memoryType,
                fee
            })
        });

        const data = await res.json() as any;
        if (!res.ok || data.error) {
            throw new Error(data.error || `Memory inscription failed (${res.status})`);
        }

        return {
            txId: data.txId,
            vectorHash: data.vectorHash,
            payload: data.memoryPayload
        };
    }

    public async transfer(params: {
        recipient: string;
        amount: number;
        fee?: number;
    }): Promise<{ txId: string; transaction: any }> {
        const fee = params.fee !== undefined ? params.fee : 0.01;
        const res = await fetch(`${this.nodeUrl}/api/transactions/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                privateKey: this.keyPair.privateKey,
                recipient: params.recipient,
                amount: params.amount,
                fee
            })
        });

        const data = await res.json() as any;
        if (!res.ok || data.error) {
            throw new Error(data.error || `Transfer failed (${res.status})`);
        }

        return {
            txId: data.txId,
            transaction: data.transaction
        };
    }

    public async queryMemories(filter?: {
        agentId?: string;
        topic?: string;
        memoryType?: string;
    }): Promise<any[]> {
        const params = new URLSearchParams();
        if (filter?.agentId) params.append('agentId', filter.agentId);
        if (filter?.topic) params.append('topic', filter.topic);
        if (filter?.memoryType) params.append('memoryType', filter.memoryType);

        const res = await fetch(`${this.nodeUrl}/api/memories?${params.toString()}`);
        if (!res.ok) return [];
        return (await res.json()) as any[];
    }

    public async searchSemanticMemories(query: string, topK: number = 5): Promise<any[]> {
        const params = new URLSearchParams({ q: query, topK: topK.toString() });
        const res = await fetch(`${this.nodeUrl}/api/memories/search?${params.toString()}`);
        if (!res.ok) return [];
        return (await res.json()) as any[];
    }

    public async getMemoryProof(txId: string): Promise<any> {
        const res = await fetch(`${this.nodeUrl}/api/memories/proof/${txId}`);
        if (!res.ok) throw new Error(`Proof not found for transaction ${txId}`);
        return await res.json();
    }
}
