import { Block } from '../core/block';
import { Transaction } from '../core/transaction';

export enum MessageType {
    HANDSHAKE = 'HANDSHAKE',
    QUERY_LATEST = 'QUERY_LATEST',
    QUERY_ALL = 'QUERY_ALL',
    RESPONSE_BLOCKCHAIN = 'RESPONSE_BLOCKCHAIN',
    BROADCAST_TRANSACTION = 'BROADCAST_TRANSACTION',
    BROADCAST_BLOCK = 'BROADCAST_BLOCK',
    PEER_DISCOVERY = 'PEER_DISCOVERY'
}

export interface P2PMessage {
    type: MessageType;
    data: any;
    nodeId?: string;
    timestamp: number;
}
