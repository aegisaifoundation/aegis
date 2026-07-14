import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
/**
 * AEGIS Distributed Inference Engine
 *
 * Architecture placeholder. This engine will provide remote inference routing,
 * GPU scheduling, model routing, and inference caching across nodes when fully
 * implemented. All networking is delegated to the Distributed Intelligence Engine.
 *
 * Future capabilities:
 * - Remote inference request routing to GPU-capable nodes
 * - Inference result caching and deduplication
 * - Dynamic model shard distribution across nodes
 * - GPU workload balancing and queue management
 */
export declare class DistributedInferenceEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private state;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    configure(_config: Record<string, any>): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    reload(): Promise<void>;
    dispose(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    /**
     * Future: Route inference request to the best available node.
     * Placeholder — not yet implemented.
     */
    routeInferenceRequest(_model: string, _prompt: string): Promise<string>;
    /**
     * Future: Schedule GPU workload on a specific node.
     * Placeholder — not yet implemented.
     */
    scheduleGpuTask(_taskId: string, _nodeId?: string): Promise<void>;
    getState(): string;
}
export default DistributedInferenceEngine;
