import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
export declare class ApiEngine implements IEngine {
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
}
