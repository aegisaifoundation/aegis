import { PeerConnectionState } from '@aegis/sdk';
import { PeerRegistry } from './PeerRegistry.js';
import { ITransportAdapter } from './ITransportAdapter.js';
import { NetworkConfigurationManager } from './NetworkConfigurationManager.js';
export interface ActivePeerConnection {
    nodeId: string;
    socket: any;
    transport: ITransportAdapter;
    state: PeerConnectionState;
    handshakeTimeout?: NodeJS.Timeout;
    remoteAddr: string;
    isOutbound: boolean;
}
export declare class ConnectionManager {
    private localNodeId;
    private localNodeName;
    private peerRegistry;
    private configManager;
    private transports;
    private activeConnections;
    private reconnectBackoffs;
    private reconnectTimers;
    private messageListeners;
    constructor(localNodeId: string, localNodeName: string, peerRegistry: PeerRegistry, configManager: NetworkConfigurationManager, transports: ITransportAdapter[]);
    connectToPeer(targetNodeId: string): Promise<ActivePeerConnection>;
    private handleIncomingTransportConnection;
    private handleTransportMessage;
    private handleIncomingHello;
    private handleIncomingHelloAck;
    private promoteConnectionToActive;
    private sendHelloFail;
    private handleTransportDisconnect;
    private scheduleReconnection;
    sendPeerMessage(targetNodeId: string, messageType: string, payload: any): Promise<void>;
    onMessage(messageType: string, callback: (payload: any, senderId: string) => void | Promise<void>): void;
    private deliverPayload;
    private findConnectionBySocket;
    private findAndCloseSocket;
    private closeConnection;
    stop(): Promise<void>;
}
