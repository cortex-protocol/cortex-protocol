import WebSocket, { WebSocketServer } from 'ws';
import { Blockchain } from '../core/blockchain';
import { Block } from '../core/block';
import { Transaction } from '../core/transaction';
import { MessageType, P2PMessage } from './protocol';
import crypto from 'crypto';

export class P2PNetwork {
    private blockchain: Blockchain;
    private p2pPort: number;
    private sockets: WebSocket[] = [];
    private peers: Set<string> = new Set();
    private nodeId: string;
    private server?: WebSocketServer;

    constructor(blockchain: Blockchain, p2pPort: number = 6001, initialPeers: string[] = []) {
        this.blockchain = blockchain;
        this.p2pPort = p2pPort;
        this.nodeId = crypto.randomBytes(8).toString('hex');

        for (const peer of initialPeers) {
            this.peers.add(peer);
        }
    }

    /**
     * Start the P2P WebSocket server
     */
    public startServer(): void {
        this.server = new WebSocketServer({ port: this.p2pPort });

        this.server.on('connection', (ws: WebSocket, req) => {
            this.initConnection(ws);
        });

        // Connect to initial bootstrap peers
        for (const peerUrl of this.peers) {
            this.connectToPeer(peerUrl);
        }
    }

    /**
     * Connect to a remote peer node
     */
    public connectToPeer(peerUrl: string): void {
        if (!peerUrl.startsWith('ws://') && !peerUrl.startsWith('wss://')) {
            peerUrl = `ws://${peerUrl}`;
        }

        try {
            const ws = new WebSocket(peerUrl);
            ws.on('open', () => {
                this.peers.add(peerUrl);
                this.initConnection(ws);
            });
            ws.on('error', () => {
                // Peer offline or unreachable
            });
        } catch (e) {
            // Ignore connection errors
        }
    }

    /**
     * Initialize event handlers for an established socket connection
     */
    private initConnection(ws: WebSocket): void {
        this.sockets.push(ws);

        // Send initial handshake
        this.sendMessage(ws, {
            type: MessageType.HANDSHAKE,
            data: {
                height: this.blockchain.chain.length - 1,
                latestHash: this.blockchain.getLatestBlock().hash
            },
            nodeId: this.nodeId,
            timestamp: Date.now()
        });

        // Query latest block from peer
        this.sendMessage(ws, {
            type: MessageType.QUERY_LATEST,
            data: null,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });

        ws.on('message', (data: string) => {
            try {
                const message: P2PMessage = JSON.parse(data.toString());
                this.handleMessage(ws, message);
            } catch (err) {
                // Invalid JSON
            }
        });

        ws.on('close', () => {
            this.sockets = this.sockets.filter(s => s !== ws);
        });

        ws.on('error', () => {
            this.sockets = this.sockets.filter(s => s !== ws);
        });
    }

    /**
     * Handle incoming P2P protocol messages
     */
    private handleMessage(ws: WebSocket, message: P2PMessage): void {
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                this.sendMessage(ws, {
                    type: MessageType.RESPONSE_BLOCKCHAIN,
                    data: [this.blockchain.getLatestBlock()],
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
                break;

            case MessageType.QUERY_ALL:
                this.sendMessage(ws, {
                    type: MessageType.RESPONSE_BLOCKCHAIN,
                    data: this.blockchain.chain,
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
                break;

            case MessageType.RESPONSE_BLOCKCHAIN:
                this.handleBlockchainResponse(ws, message.data);
                break;

            case MessageType.BROADCAST_TRANSACTION:
                try {
                    const tx = new Transaction(message.data);
                    const res = this.blockchain.mempool.addTransaction(tx);
                    if (res.success) {
                        // Re-broadcast to other peers
                        this.broadcastExcept(ws, message);
                    }
                } catch {
                    // Invalid tx
                }
                break;

            case MessageType.BROADCAST_BLOCK:
                try {
                    const block = new Block(
                        message.data.index,
                        message.data.previousHash,
                        message.data.timestamp,
                        message.data.transactions,
                        message.data.difficulty,
                        message.data.nonce,
                        message.data.minerAddress,
                        message.data.hash
                    );
                    const res = this.blockchain.addBlock(block);
                    if (res.success) {
                        // Re-broadcast block to peers
                        this.broadcastExcept(ws, message);
                    } else {
                        // If index is ahead, query all blocks
                        if (block.index > this.blockchain.getLatestBlock().index + 1) {
                            this.sendMessage(ws, {
                                type: MessageType.QUERY_ALL,
                                data: null,
                                nodeId: this.nodeId,
                                timestamp: Date.now()
                            });
                        }
                    }
                } catch {
                    // Invalid block
                }
                break;
        }
    }

    /**
     * Handle received blockchain blocks for consensus sync
     */
    private handleBlockchainResponse(ws: WebSocket, receivedBlocks: any[]): void {
        if (!Array.isArray(receivedBlocks) || receivedBlocks.length === 0) return;

        const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        const latestBlockHeld = this.blockchain.getLatestBlock();

        if (latestBlockReceived.index > latestBlockHeld.index) {
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                // We are just 1 block behind, try to add it
                const block = new Block(
                    latestBlockReceived.index,
                    latestBlockReceived.previousHash,
                    latestBlockReceived.timestamp,
                    latestBlockReceived.transactions,
                    latestBlockReceived.difficulty,
                    latestBlockReceived.nonce,
                    latestBlockReceived.minerAddress,
                    latestBlockReceived.hash
                );
                this.blockchain.addBlock(block);
            } else if (receivedBlocks.length === 1) {
                // We have a longer chain elsewhere, query entire chain
                this.sendMessage(ws, {
                    type: MessageType.QUERY_ALL,
                    data: null,
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
            } else {
                // Received full chain: try replacing with longest valid chain
                const fullChain = receivedBlocks.map(b => new Block(
                    b.index,
                    b.previousHash,
                    b.timestamp,
                    b.transactions,
                    b.difficulty,
                    b.nonce,
                    b.minerAddress,
                    b.hash
                ));
                this.blockchain.replaceChain(fullChain);
            }
        }
    }

    /**
     * Broadcast a message to all connected peers
     */
    public broadcast(message: P2PMessage): void {
        const payload = JSON.stringify(message);
        for (const socket of this.sockets) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(payload);
            }
        }
    }

    /**
     * Broadcast to all sockets except the sender
     */
    private broadcastExcept(exceptSocket: WebSocket, message: P2PMessage): void {
        const payload = JSON.stringify(message);
        for (const socket of this.sockets) {
            if (socket !== exceptSocket && socket.readyState === WebSocket.OPEN) {
                socket.send(payload);
            }
        }
    }

    /**
     * Helper to send JSON message to a single socket
     */
    private sendMessage(ws: WebSocket, message: P2PMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Broadcast a newly mined block
     */
    public broadcastBlock(block: Block): void {
        this.broadcast({
            type: MessageType.BROADCAST_BLOCK,
            data: block,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
    }

    /**
     * Broadcast a new transaction
     */
    public broadcastTransaction(tx: Transaction): void {
        this.broadcast({
            type: MessageType.BROADCAST_TRANSACTION,
            data: tx,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
    }

    /**
     * Get active peer count and addresses
     */
    public getNetworkStats() {
        return {
            nodeId: this.nodeId,
            p2pPort: this.p2pPort,
            activeConnections: this.sockets.length,
            knownPeers: Array.from(this.peers)
        };
    }
}
