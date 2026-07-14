import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { DiscoveryService, MessagingService, TransportService, ExecutionService, CapabilityService, ResourceService, TrustService, SchedulerService, EventService, IEngineIpcHost } from '../services/index.js';
export declare class DistributedIntelligenceEngine implements IEngine, IEngineIpcHost {
    readonly metadata: IEngineMetadata;
    private lifecycle;
    private context;
    readonly discoveryService: DiscoveryService;
    readonly messagingService: MessagingService;
    readonly transportService: TransportService;
    readonly executionService: ExecutionService;
    readonly capabilityService: CapabilityService;
    readonly resourceService: ResourceService;
    readonly trustService: TrustService;
    readonly schedulerService: SchedulerService;
    readonly eventService: EventService;
    getIpcManager(): import("../ipc/IPCManager.js").IPCManager;
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