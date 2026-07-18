import { ITransportClient, SyscallMessage, SyscallResponse } from '../types/syscall.js';
export declare class MockTransport implements ITransportClient {
    private connected;
    private listeners;
    connect(options: {
        endpoint: string;
        apiKey?: string;
    }): Promise<void>;
    disconnect(): Promise<void>;
    send(message: SyscallMessage): Promise<SyscallResponse>;
    subscribe(event: string, callback: (payload: any) => void): Promise<string>;
    unsubscribe(subscriptionId: string): Promise<void>;
}
export declare class LoopbackTransport implements ITransportClient {
    private connected;
    private listeners;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(message: SyscallMessage): Promise<SyscallResponse>;
    subscribe(event: string, callback: (payload: any) => void): Promise<string>;
    unsubscribe(subscriptionId: string): Promise<void>;
}
export declare class AegisSDK {
    private transport;
    private apiKey?;
    private correlationId;
    private sessionId;
    private userId;
    constructor(transport: ITransportClient);
    static initialize(options?: {
        endpoint?: string;
        apiKey?: string;
        transport?: 'mock' | 'loopback' | 'ipc';
    }): Promise<AegisSDK>;
    shutdown(): Promise<void>;
    setSession(sessionId: string, userId?: string): void;
    private syscall;
    version(): Promise<string>;
    platformInfo(): Promise<any>;
    runtimeHealth(): Promise<any>;
    nodeInfo(): Promise<any>;
    installPackage(packageId: string): Promise<any>;
    createDataset(id: string, path: string): Promise<any>;
    createTrainingJob(jobId: string, datasetId: string): Promise<any>;
    exportLoRA(jobId: string): Promise<any>;
    createLearningRound(roundId: string): Promise<any>;
    createSwarm(swarmId: string): Promise<any>;
    generate(prompt: string, options?: any): Promise<any>;
    discoverNodes(): Promise<any>;
    publishKnowledge(key: string, content: any): Promise<any>;
    storeMemory(key: string, value: any): Promise<any>;
    subscribe(event: string, callback: (payload: any) => void): Promise<string>;
}
