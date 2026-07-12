import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { ICheckpointable } from '@aegis/runtime';
export declare class MemoryEngine implements IEngine, ICheckpointable {
    readonly metadata: IEngineMetadata;
    private context;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    configure(config: Record<string, any>): Promise<void>;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    reload(): Promise<void>;
    shutdown(): Promise<void>;
    dispose(): Promise<void>;
    createCheckpoint(name: string, sessionId?: string): Promise<void>;
    rollbackToCheckpoint(name: string, sessionId?: string): Promise<void>;
}
