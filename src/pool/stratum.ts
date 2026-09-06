import net from 'net';
import crypto from 'crypto';
import { CortexMiningPool } from './pool';
import { CortexRandomX } from '../core/randomx';

interface StratumJob {
    jobId: string;
    templateIndex: number;
    previousHash: string;
    timestamp: number;
    difficulty: number;
    shareDifficulty: number;
    headerPrefix: string;
    headerSuffix: string;
    seed: string;
    targetHex: string;
    blobHex: string;
    transactions: any[];
    createdAt: number;
}

interface StratumClient {
    id: string;
    socket: net.Socket;
    protocol: 'monero' | 'classic';
    minerAddress: string;
    workerId: string;
    agent: string;
    difficulty: number;
    targetHex: string;
    authorized: boolean;
    subscribed: boolean;
    sharesSubmitted: number;
    sharesAccepted: number;
    lastShareTime: number;
    calculatedHashrate: number;
    buffer: string;
    currentJobId?: string;
}

export class CortexStratumServer {
    private pool: CortexMiningPool;
    private port: number;
    private server: net.Server | null = null;
    private clients: Map<string, StratumClient> = new Map();
    private jobs: Map<string, StratumJob> = new Map();
    private latestJob: StratumJob | null = null;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor(pool: CortexMiningPool, port: number = 3333) {
        this.pool = pool;
        this.port = port;
    }

    /**
     * Start the Stratum TCP Socket Server
     */
    public start(): void {
        this.generateNewJob();

        this.server = net.createServer((socket) => {
            this.handleConnection(socket);
        });

        this.server.on('error', (err) => {
            console.error(`\x1b[31m[STRATUM] Server TCP Error on port ${this.port}:\x1b[0m`, err.message);
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`\x1b[35m[STRATUM] High-Performance TCP Mining Bridge active on port ${this.port}\x1b[0m`);
            console.log(`\x1b[35m[STRATUM] Compatible with XMRig, SRBMiner & HiveOS rigs (RandomX rx/0)\x1b[0m`);
        });

        // Check for new block templates and broadcast jobs to miners
        this.updateInterval = setInterval(() => {
            this.checkAndBroadcastNewJob();
        }, 1200);
    }

    /**
     * Stop Stratum Server
     */
    public stop(): void {
        if (this.updateInterval) clearInterval(this.updateInterval);
        for (const client of this.clients.values()) {
            try { client.socket.destroy(); } catch {}
        }
        this.clients.clear();
        if (this.server) this.server.close();
    }

    /**
     * Get active Stratum metrics
     */
    public getStats() {
        let totalStratumHashrate = 0;
        for (const client of this.clients.values()) {
            totalStratumHashrate += client.calculatedHashrate;
        }
        return {
            connectedMiners: this.clients.size,
            totalStratumHashrate,
            port: this.port
        };
    }

    private handleConnection(socket: net.Socket) {
        const clientId = crypto.randomBytes(8).toString('hex');
        const client: StratumClient = {
            id: clientId,
            socket,
            protocol: 'monero',
            minerAddress: '',
            workerId: 'rig-1',
            agent: 'Generic/1.0',
            difficulty: this.pool.shareDifficulty,
            targetHex: this.diffToTargetHex(this.pool.shareDifficulty),
            authorized: false,
            subscribed: false,
            sharesSubmitted: 0,
            sharesAccepted: 0,
            lastShareTime: Date.now(),
            calculatedHashrate: 0,
            buffer: ''
        };

        this.clients.set(clientId, client);

        socket.setKeepAlive(true, 30000);
        socket.setNoDelay(true);

        socket.on('data', (data) => {
            client.buffer += data.toString('utf8');
            const lines = client.buffer.split('\n');
            client.buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    this.handleMessage(client, trimmed);
                }
            }
        });

        socket.on('error', () => {
            this.clients.delete(clientId);
        });

        socket.on('close', () => {
            this.clients.delete(clientId);
        });
    }

    private handleMessage(client: StratumClient, rawMsg: string) {
        let msg: any;
        try {
            msg = JSON.parse(rawMsg);
        } catch {
            return; // Ignore malformed non-JSON lines
        }

        const method = msg.method;
        const msgId = msg.id ?? 1;

        // Monero / XMRig RandomX RPC Dialect
        if (method === 'login') {
            this.handleXmrigLogin(client, msgId, msg.params);
        } else if (method === 'submit') {
            this.handleXmrigSubmit(client, msgId, msg.params);
        } else if (method === 'keepalived' || method === 'keepalive') {
            this.sendResponse(client, {
                id: msgId,
                jsonrpc: '2.0',
                error: null,
                result: { status: 'KEEPALIVED' }
            });
        } else if (method === 'getjobtemplate') {
            this.handleGetJobTemplate(client, msgId);
        }
        // Classic Bitcoin/NiceHash Stratum RPC Dialect
        else if (method === 'mining.subscribe') {
            this.handleClassicSubscribe(client, msgId, msg.params);
        } else if (method === 'mining.authorize') {
            this.handleClassicAuthorize(client, msgId, msg.params);
        } else if (method === 'mining.submit') {
            this.handleClassicSubmit(client, msgId, msg.params);
        } else if (method === 'mining.extranonce.subscribe') {
            this.sendResponse(client, { id: msgId, result: true, error: null });
        } else {
            // Default acknowledge
            this.sendResponse(client, { id: msgId, jsonrpc: '2.0', error: null, result: { status: 'OK' } });
        }
    }

    /**
     * Handle XMRig standard login: { login, pass, agent, rigid, algo }
     */
    private handleXmrigLogin(client: StratumClient, msgId: any, params: any) {
        client.protocol = 'monero';
        let rawLogin = (params?.login || '').trim();
        let worker = (params?.rigid || '').trim();

        // Support "address.worker_name" syntax
        if (rawLogin.includes('.')) {
            const parts = rawLogin.split('.');
            client.minerAddress = parts[0];
            client.workerId = parts.slice(1).join('.') || worker || 'worker-1';
        } else {
            client.minerAddress = rawLogin;
            client.workerId = worker || 'worker-1';
        }

        // Fallback default address if invalid format
        if (!client.minerAddress.startsWith('ctx1') || client.minerAddress.length < 20) {
            client.minerAddress = this.pool.getPoolAddress();
        }

        client.agent = params?.agent || 'XMRig';
        client.authorized = true;
        client.subscribed = true;

        if (!this.latestJob) {
            this.generateNewJob();
        }

        const job = this.latestJob!;
        client.currentJobId = job.jobId;

        console.log(`\x1b[32m[STRATUM] Connected Miner:\x1b[0m ${client.minerAddress.substring(0, 12)}... (Worker: ${client.workerId}, Client: ${client.agent})`);

        this.sendResponse(client, {
            id: msgId,
            jsonrpc: '2.0',
            error: null,
            result: {
                id: client.id,
                job: {
                    blob: job.blobHex,
                    job_id: job.jobId,
                    target: client.targetHex,
                    seed_hash: job.seed,
                    height: job.templateIndex,
                    algo: 'rx/0'
                },
                status: 'OK',
                extensions: ['algo', 'keepalive']
            }
        });
    }

    /**
     * Handle XMRig share submission: { id, job_id, nonce, result }
     */
    private handleXmrigSubmit(client: StratumClient, msgId: any, params: any) {
        client.sharesSubmitted++;
        const jobId = params?.job_id;
        const nonceHex = params?.nonce || '0';
        const reportedHash = params?.result;

        const job = this.jobs.get(jobId) || this.latestJob;
        if (!job) {
            this.sendResponse(client, {
                id: msgId,
                jsonrpc: '2.0',
                error: { code: -1, message: 'Stale or expired job ID' },
                result: null
            });
            return;
        }

        // Parse 32-bit nonce from hex (both LE and BE supported)
        let numericNonce = 0;
        try {
            if (typeof nonceHex === 'string') {
                const cleanHex = nonceHex.replace(/^0x/, '');
                if (cleanHex.length === 8) {
                    const buf = Buffer.from(cleanHex, 'hex');
                    numericNonce = buf.readUInt32LE(0);
                } else {
                    numericNonce = parseInt(cleanHex, 16) || 0;
                }
            } else if (typeof nonceHex === 'number') {
                numericNonce = nonceHex;
            }
        } catch {
            numericNonce = Math.floor(Math.random() * 1000000);
        }

        // Verify share hash
        const header = `${job.headerPrefix}${numericNonce}${job.headerSuffix}`;
        const computedHash = CortexRandomX.hash(header, job.seed);

        const targetPrefix = '0'.repeat(job.shareDifficulty);
        const validShare = computedHash.startsWith(targetPrefix);

        if (validShare) {
            client.sharesAccepted++;
            this.recordShareTelemetry(client);

            // Forward valid share to Cortex Pool engine (PPLNS reward & founder fee)
            const shareResult = this.pool.submitShare({
                minerAddress: client.minerAddress,
                workerId: client.workerId,
                hashrate: client.calculatedHashrate,
                index: job.templateIndex,
                previousHash: job.previousHash,
                timestamp: job.timestamp,
                transactions: job.transactions,
                difficulty: job.difficulty,
                nonce: numericNonce,
                hash: computedHash
            });

            this.sendResponse(client, {
                id: msgId,
                jsonrpc: '2.0',
                error: null,
                result: { status: 'OK' }
            });

            if (shareResult.blockFound) {
                console.log(`\x1b[1;35m🎉🎉 [STRATUM] JACKPOT! Block #${job.templateIndex} solved via Stratum Rig ${client.workerId}!\x1b[0m`);
                this.generateNewJob();
                this.broadcastCurrentJob();
            }
        } else {
            this.sendResponse(client, {
                id: msgId,
                jsonrpc: '2.0',
                error: { code: -1, message: 'Low difficulty share' },
                result: null
            });
        }
    }

    /**
     * Classic Stratum Subscribe
     */
    private handleClassicSubscribe(client: StratumClient, msgId: any, params: any) {
        client.protocol = 'classic';
        client.agent = (params && params[0]) ? String(params[0]) : 'Miner/1.0';
        client.subscribed = true;

        const extraNonce1 = client.id.substring(0, 8);
        const extraNonce2Size = 4;

        this.sendResponse(client, {
            id: msgId,
            result: [
                [['mining.set_difficulty', client.id], ['mining.notify', client.id]],
                extraNonce1,
                extraNonce2Size
            ],
            error: null
        });

        // Set difficulty and push job
        this.sendResponse(client, {
            method: 'mining.set_difficulty',
            params: [client.difficulty]
        });

        if (this.latestJob) {
            this.sendClassicNotify(client, this.latestJob, true);
        }
    }

    /**
     * Classic Stratum Authorize
     */
    private handleClassicAuthorize(client: StratumClient, msgId: any, params: any) {
        const username = (params && params[0]) ? String(params[0]) : '';
        if (username.includes('.')) {
            const parts = username.split('.');
            client.minerAddress = parts[0];
            client.workerId = parts.slice(1).join('.');
        } else {
            client.minerAddress = username;
            client.workerId = 'worker-1';
        }

        if (!client.minerAddress.startsWith('ctx1')) {
            client.minerAddress = this.pool.getPoolAddress();
        }

        client.authorized = true;
        this.sendResponse(client, { id: msgId, result: true, error: null });

        if (this.latestJob) {
            this.sendClassicNotify(client, this.latestJob, true);
        }
    }

    /**
     * Classic Stratum Submit
     */
    private handleClassicSubmit(client: StratumClient, msgId: any, params: any) {
        const jobId = params ? params[1] : '';
        const nonceHex = params ? params[4] : '0';

        let numericNonce = 0;
        try {
            numericNonce = parseInt(nonceHex, 16) || 0;
        } catch {
            numericNonce = 0;
        }

        const job = this.jobs.get(jobId) || this.latestJob;
        if (!job) {
            this.sendResponse(client, { id: msgId, result: false, error: [21, 'Job not found', null] });
            return;
        }

        const header = `${job.headerPrefix}${numericNonce}${job.headerSuffix}`;
        const computedHash = CortexRandomX.hash(header, job.seed);
        const validShare = computedHash.startsWith('0'.repeat(job.shareDifficulty));

        if (validShare) {
            client.sharesAccepted++;
            this.recordShareTelemetry(client);

            this.pool.submitShare({
                minerAddress: client.minerAddress,
                workerId: client.workerId,
                hashrate: client.calculatedHashrate,
                index: job.templateIndex,
                previousHash: job.previousHash,
                timestamp: job.timestamp,
                transactions: job.transactions,
                difficulty: job.difficulty,
                nonce: numericNonce,
                hash: computedHash
            });

            this.sendResponse(client, { id: msgId, result: true, error: null });
        } else {
            this.sendResponse(client, { id: msgId, result: false, error: [23, 'Low difficulty share', null] });
        }
    }

    private handleGetJobTemplate(client: StratumClient, msgId: any) {
        if (!this.latestJob) this.generateNewJob();
        const job = this.latestJob!;
        this.sendResponse(client, {
            id: msgId,
            jsonrpc: '2.0',
            error: null,
            result: {
                blob: job.blobHex,
                job_id: job.jobId,
                target: client.targetHex,
                seed_hash: job.seed,
                height: job.templateIndex,
                algo: 'rx/0'
            }
        });
    }

    /**
     * VarDiff and client telemetry tracking
     */
    private recordShareTelemetry(client: StratumClient) {
        const now = Date.now();
        const intervalSec = (now - client.lastShareTime) / 1000;
        client.lastShareTime = now;

        if (intervalSec > 0.1 && intervalSec < 120) {
            const hashesPerShare = Math.pow(16, client.difficulty);
            const instantHashrate = Math.round(hashesPerShare / intervalSec);
            client.calculatedHashrate = Math.round((client.calculatedHashrate * 0.7) + (instantHashrate * 0.3));

            if (intervalSec < 1.5 && client.difficulty < 5) {
                client.difficulty++;
                client.targetHex = this.diffToTargetHex(client.difficulty);
            } else if (intervalSec > 25 && client.difficulty > this.pool.shareDifficulty) {
                client.difficulty--;
                client.targetHex = this.diffToTargetHex(client.difficulty);
            }
        }
    }

    private generateNewJob(): StratumJob {
        const template = this.pool.getWorkTemplate(this.pool.getPoolAddress(), 'stratum-hub', 0);
        const jobId = crypto.randomBytes(6).toString('hex');
        const seed = CortexRandomX.getSeedForBlock(template.index);

        const prefixBuf = Buffer.from(template.headerPrefix, 'utf8');
        const paddedBuf = Buffer.alloc(76);
        prefixBuf.copy(paddedBuf, 0, 0, Math.min(prefixBuf.length, 76));
        const blobHex = paddedBuf.toString('hex');

        const job: StratumJob = {
            jobId,
            templateIndex: template.index,
            previousHash: template.previousHash,
            timestamp: template.timestamp,
            difficulty: template.difficulty,
            shareDifficulty: template.shareDifficulty,
            headerPrefix: template.headerPrefix,
            headerSuffix: template.headerSuffix,
            seed,
            targetHex: this.diffToTargetHex(template.shareDifficulty),
            blobHex,
            transactions: template.transactions,
            createdAt: Date.now()
        };

        this.jobs.set(jobId, job);
        this.latestJob = job;

        if (this.jobs.size > 25) {
            const oldestKey = this.jobs.keys().next().value;
            if (oldestKey) this.jobs.delete(oldestKey);
        }

        return job;
    }

    private checkAndBroadcastNewJob() {
        const latestBlock = this.pool.getBlockchain().getLatestBlock();
        if (!this.latestJob || this.latestJob.templateIndex !== latestBlock.index + 1 || this.latestJob.previousHash !== latestBlock.hash) {
            this.generateNewJob();
            this.broadcastCurrentJob();
        }
    }

    public broadcastCurrentJob(): void {
        if (!this.latestJob) return;
        const job = this.latestJob;

        for (const client of this.clients.values()) {
            if (!client.authorized && !client.subscribed) continue;

            if (client.protocol === 'monero') {
                this.sendResponse(client, {
                    jsonrpc: '2.0',
                    method: 'job',
                    params: {
                        blob: job.blobHex,
                        job_id: job.jobId,
                        target: client.targetHex,
                        seed_hash: job.seed,
                        height: job.templateIndex,
                        algo: 'rx/0'
                    }
                });
            } else {
                this.sendClassicNotify(client, job, true);
            }
        }
    }

    private sendClassicNotify(client: StratumClient, job: StratumJob, cleanJobs: boolean = true) {
        this.sendResponse(client, {
            method: 'mining.notify',
            params: [
                job.jobId,
                job.previousHash,
                job.headerPrefix,
                job.headerSuffix,
                [],
                '00000001',
                job.difficulty.toString(16),
                Math.floor(job.timestamp / 1000).toString(16),
                cleanJobs
            ]
        });
    }

    private sendResponse(client: StratumClient, payload: any) {
        try {
            if (client.socket.writable) {
                client.socket.write(JSON.stringify(payload) + '\n');
            }
        } catch {}
    }

    private diffToTargetHex(difficulty: number): string {
        const diff = Math.max(1, difficulty);
        const targetValue = Math.floor(0xFFFFFFFF / Math.pow(16, Math.max(0, diff - 1)));
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(Math.max(1, targetValue), 0);
        return buf.toString('hex');
    }
}
