export interface ResourceAllocation {
    readonly sessionId: string;
    readonly nodeId: string;
    readonly cpu: number;
    readonly memory: number;
    readonly storage: number;
    readonly gpuTimeMs: number;
    readonly approved: boolean;
}
export declare class CollaborationSessionManager {
    private sessionSandboxes;
    private resourceAllocations;
    createSandbox(sessionId: string, initialNodeIds: string[]): void;
    isAuthorized(sessionId: string, nodeId: string): boolean;
    addToSandbox(sessionId: string, nodeId: string): void;
    negotiateResource(sessionId: string, nodeId: string, required: {
        cpu?: number;
        memory?: number;
        storage?: number;
        gpuTimeMs?: number;
    }): Promise<ResourceAllocation>;
    getAllocation(sessionId: string, nodeId: string): ResourceAllocation | undefined;
    closeSandbox(sessionId: string): void;
}
