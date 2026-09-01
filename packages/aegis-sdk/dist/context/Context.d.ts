import { ILogger } from '../logging/ILogger.js';
import { IEventBus } from '../types/Events.js';
export interface INodeIdentity {
    readonly nodeId: string;
    readonly nodeName: string;
    readonly createdAt: string;
    readonly publicKey?: string;
    readonly fingerprint?: string;
}
export declare const AEGIS_NET_PROTOCOL_VERSION = "1.0.0";
export declare enum PeerConnectionState {
    DISCONNECTED = "DISCONNECTED",
    DISCOVERED = "DISCOVERED",
    CONNECTING = "CONNECTING",
    TRANSPORT_CONNECTED = "TRANSPORT_CONNECTED",
    HANDSHAKING = "HANDSHAKING",
    VERIFIED = "VERIFIED",
    ACTIVE = "ACTIVE"
}
export interface IPeerEndpoint {
    transport: 'tcp' | 'websocket' | 'native_tcp' | string;
    host: string;
    port: number;
    priority?: number;
    lastVerified?: number;
}
export interface IPeerDescriptor {
    readonly nodeId: string;
    nodeName?: string;
    endpoints: IPeerEndpoint[];
    capabilities?: string[];
    connectionState: PeerConnectionState;
    lastSeen?: number;
    metadata?: Record<string, unknown>;
}
export interface IDiscoveryProvider {
    readonly name: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    onPeerDiscovered(callback: (peer: IPeerDescriptor) => void): void;
}
export interface IRuntimeContext_v1 {
    readonly nodeId: string;
    readonly runtimeId: string;
    readonly kernelVersion: string;
    readonly bootId: string;
    readonly platform: string;
    readonly architecture: string;
    readonly bootMode: 'NORMAL' | 'SAFE_MODE' | 'RECOVERY_MODE';
    getNodeIdentity(): INodeIdentity;
    getWorkspacePath(): string;
    getLogger(): ILogger;
    getConfig(): Record<string, any>;
    getSecrets(): Record<string, string>;
    getService<T>(tokenName: string): T;
    getEventBus(): IEventBus;
}
