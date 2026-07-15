import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { CollaborationManager } from './manager/CollaborationManager.js';
import { CapabilityDiscoveryManager } from './manager/CapabilityDiscoveryManager.js';
import { CollaborationSessionManager } from './manager/CollaborationSessionManager.js';
import { PolicyManager } from './manager/PolicyManager.js';
import { ConsensusManager } from './manager/ConsensusManager.js';
import { ReputationManager } from './manager/ReputationManager.js';
import { ReasoningManager } from './manager/ReasoningManager.js';
import { ExchangeManager } from './manager/ExchangeManager.js';
import { CollaborationSession, CapabilityInfo, KnowledgePackage, ExperiencePackage, ConsensusVote } from './types/index.js';
export declare class CollaborationEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private workspacePath;
    private localNodeId;
    private collaborationManager;
    private discoveryManager;
    private sessionManager;
    private policyManager;
    private consensusManager;
    private reputationManager;
    private reasoningManager;
    private exchangeManager;
    private initStartTime;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    configure(config: Record<string, any>): Promise<void>;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    reload(): Promise<void>;
    shutdown(): Promise<void>;
    dispose(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    /** 1. Create a secure collaboration session */
    CreateCollaboration(name: string, participants: string[], metadata?: Record<string, any>): CollaborationSession;
    /** 2. Join a session as participant */
    JoinCollaboration(sessionId: string, creatorNodeId: string, inviteMetadata?: any): boolean;
    /** 3. Leave session */
    LeaveCollaboration(sessionId: string): void;
    /** 4. Discover remote capabilities */
    DiscoverCapabilities(filter: any): CapabilityInfo[];
    /** 5. Request a tool from a target node */
    RequestTool(toolId: string, targetNodeId: string): Promise<boolean>;
    /** 6. Request a skill from a target node */
    RequestSkill(skillId: string, targetNodeId: string): Promise<boolean>;
    /** 7. Request an agent package */
    RequestAgent(agentId: string, targetNodeId: string): Promise<boolean>;
    /** 8. Request a workflow package */
    RequestWorkflow(workflowId: string, targetNodeId: string): Promise<boolean>;
    /** 9. Share a signed KnowledgePackage metadata package */
    ShareKnowledge(entityId: string, facts: string[], allowedNodes: string[], allowedUses: any[]): KnowledgePackage;
    /** 10. Share a signed ExperiencePackage */
    ShareExperience(problem: string, reasoningChain: string[], actions: any[], result: any, confidence: number): ExperiencePackage;
    /** 11. Coordinate distributed planning and local reasoning */
    StartReasoning(prompt: string, nodes: string[], consensusMechanism?: any): Promise<{
        response: string;
        consensusScore: number;
        votes: {
            nodeId: string;
            approve: boolean;
            confidence: number;
        }[];
    }>;
    /** 12. Tally votes and compute consensus */
    VoteConsensus(votes: ConsensusVote[], mechanism: any, nodeWeights?: Record<string, number>): {
        approved: boolean;
        consensusScore: number;
    };
    /** 13. Publish knowledge updates securely */
    PublishKnowledge(pkg: KnowledgePackage): Promise<boolean>;
    /** 14. Check active session status */
    CollaborationStatus(sessionId: string): string;
    /** 15. Check reputation score */
    Reputation(nodeId: string): import("./types/index.js").ReputationMetrics;
    /** 16. Get trust score */
    TrustMetrics(nodeId: string): number;
    getCollaborationManager(): CollaborationManager;
    getDiscoveryManager(): CapabilityDiscoveryManager;
    getSessionManager(): CollaborationSessionManager;
    getPolicyManager(): PolicyManager;
    getConsensusManager(): ConsensusManager;
    getReputationManager(): ReputationManager;
    getReasoningManager(): ReasoningManager;
    getExchangeManager(): ExchangeManager;
}
export default CollaborationEngine;
