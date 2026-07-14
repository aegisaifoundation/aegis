import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
/**
 * AEGIS Knowledge Synchronization Engine
 *
 * Architecture placeholder. This engine will provide distributed knowledge graph
 * synchronization, vector database exchange, memory synchronization, and semantic
 * conflict resolution across federated nodes when fully implemented.
 * All networking is delegated to the Distributed Intelligence Engine.
 *
 * Future capabilities:
 * - Knowledge graph delta synchronization between nodes
 * - Vector embedding exchange for shared RAG contexts
 * - Session memory merging and deduplication
 * - Semantic conflict resolution with configurable merge strategies
 */
export declare class KnowledgeSyncEngine implements IEngine {
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
     * Future: Synchronize knowledge graph deltas with a peer node.
     * Placeholder — not yet implemented.
     */
    syncKnowledgeGraph(_targetNodeId: string): Promise<void>;
    /**
     * Future: Exchange vector embeddings with a peer node for shared RAG context.
     * Placeholder — not yet implemented.
     */
    exchangeVectorEmbeddings(_targetNodeId: string, _collectionId: string): Promise<void>;
    /**
     * Future: Merge session memories from a remote node with conflict resolution.
     * Placeholder — not yet implemented.
     */
    mergeSessionMemory(_remoteNodeId: string, _sessionId: string): Promise<void>;
    getState(): string;
}
export default KnowledgeSyncEngine;
