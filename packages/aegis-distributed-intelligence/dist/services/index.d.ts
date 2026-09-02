export interface IEngineIpcHost {
    getIpcManager(): any;
}
export declare const activeEngines: Map<string, any>;
export declare class DiscoveryService {
    private host;
    private localPeers;
    constructor(host: IEngineIpcHost);
    private getRegistry;
    discoverNodes(): Promise<string[]>;
    registerNode(nodeId: string, host: string, port: number): Promise<void>;
    removeNode(nodeId: string): Promise<void>;
    getLocalPeer(nodeId: string): {
        host: any;
        port: any;
    } | undefined;
    getLocalPeers(): any;
}
export declare class MessagingService {
    private host;
    private listeners;
    constructor(host: IEngineIpcHost);
    private getConnectionManager;
    sendMessage(targetNodeId: string, messageType: string, payload: Record<string, any>): Promise<void>;
    private sendDirect;
    onMessage(messageType: string, callback: (payload: any, senderId: string) => void | Promise<void>): void;
    deliverMessage(messageType: string, payload: any, senderId: string): void;
}
export declare class TransportService {
    private host;
    constructor(host: IEngineIpcHost);
    getStatus(): Promise<Record<string, any>>;
    getConnectionCount(): Promise<number>;
}
export declare class ExecutionService {
    private host;
    constructor(host: IEngineIpcHost);
    submitTask(task: any): Promise<void>;
    cancelTask(taskId: string): Promise<void>;
    onTaskCompleted(taskId: string, callback: (result: any) => void): void;
}
export declare class CapabilityService {
    private host;
    constructor(host: IEngineIpcHost);
    advertiseCapabilities(caps: any[]): Promise<void>;
    getRemoteCapabilities(nodeId: string): Promise<any[]>;
}
export declare class ResourceService {
    private host;
    constructor(host: IEngineIpcHost);
    getAvailableResources(): Promise<Record<string, any>>;
    getRemoteResources(nodeId: string): Promise<Record<string, any>>;
}
export declare class TrustService {
    private host;
    constructor(host: IEngineIpcHost);
    verifyPeerTrust(nodeId: string): Promise<boolean>;
}
export declare class SchedulerService {
    private host;
    constructor(host: IEngineIpcHost);
    scheduleTask(task: any, candidateNodes: string[]): Promise<string>;
}
export declare class EventService {
    private host;
    constructor(host: IEngineIpcHost);
    publishEvent(eventName: string, payload: any): Promise<void>;
    subscribe(eventName: string, callback: (payload: any) => void): void;
}
//# sourceMappingURL=index.d.ts.map