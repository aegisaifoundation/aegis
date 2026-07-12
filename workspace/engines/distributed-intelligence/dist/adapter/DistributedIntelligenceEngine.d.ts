import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
export declare class DistributedIntelligenceEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private lifecycle;
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
    getState(): string;
    getPid(): number | undefined;
    getStartedAt(): Date | null;
    getUptimeMs(): number;
    getRestartCount(): number;
    private resolveExecutable;
}
export default DistributedIntelligenceEngine;
//# sourceMappingURL=DistributedIntelligenceEngine.d.ts.map