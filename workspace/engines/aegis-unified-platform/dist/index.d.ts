import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
export declare class UnifiedPlatformEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private isRunning;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    configure(config: Record<string, any>): Promise<void>;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    reload(): Promise<void>;
    dispose(): Promise<void>;
    health(): Promise<EngineHealthReport>;
}
export default UnifiedPlatformEngine;
export * from './types/index.js';
export * from './eventbus/EventSpecification.js';
export * from './registry/CapabilityRegistry.js';
export * from './degradation/GracefulDegradator.js';
export * from './config/UnifiedConfig.js';
export * from './logging/UnifiedLogger.js';
export * from './monitoring/UnifiedMonitor.js';
export * from './dashboard/UnifiedDashboardSync.js';
