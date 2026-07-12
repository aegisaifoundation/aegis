import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
export type DieEngineState = 'REGISTERED' | 'STARTING' | 'ONLINE' | 'STOPPING' | 'STOPPED' | 'FAILED' | 'RESTARTING' | 'UNKNOWN';
export declare class DistributedIntelligenceEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private process;
    private state;
    private restartCount;
    private startedAt;
    private executablePath;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    configure(_config: Record<string, any>): Promise<void>;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    reload(): Promise<void>;
    shutdown(): Promise<void>;
    dispose(): Promise<void>;
    getState(): DieEngineState;
    getPid(): number | undefined;
    getStartedAt(): Date | null;
    getUptimeMs(): number;
    getRestartCount(): number;
    private launchProcess;
    private terminateProcess;
    private scheduleRestart;
    private resolveExecutable;
    private setState;
    private log;
}
//# sourceMappingURL=DistributedIntelligenceEngine.d.ts.map