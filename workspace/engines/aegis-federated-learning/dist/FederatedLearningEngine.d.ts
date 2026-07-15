import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
export declare class FederatedLearningEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private state;
    private currentRound;
    private activeModelVersion;
    private trainingMetrics;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    configure(_config: Record<string, any>): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    reload(): Promise<void>;
    dispose(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    private setupListeners;
    runLocalTrainingRound(roundId: string, globalWeights: any, coordinatorId: string): Promise<void>;
    triggerGlobalModelSync(): Promise<void>;
    exportLoRAWeights(): string;
    getState(): string;
}
export default FederatedLearningEngine;
