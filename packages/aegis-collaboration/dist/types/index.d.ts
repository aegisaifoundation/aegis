/**
 * Shared type definitions for the AEGIS Collaboration Engine.
 */
export interface CollaborationSession {
    readonly sessionId: string;
    readonly name: string;
    status: 'active' | 'closed';
    readonly participants: string[];
    readonly creatorNodeId: string;
    readonly createdAt: Date;
    readonly metadata: Record<string, any>;
}
export interface CapabilityInfo {
    readonly nodeId: string;
    readonly engines: string[];
    readonly tools: string[];
    readonly skills: string[];
    readonly models: string[];
    readonly agents: string[];
    readonly workflows: string[];
    readonly datasets: {
        id: string;
        name: string;
        description: string;
    }[];
    readonly resourceLimits: {
        readonly cpu: number;
        readonly memory: number;
        readonly storage: number;
        readonly gpu: boolean;
    };
    readonly trustScore: number;
}
export interface KnowledgePackage {
    readonly id: string;
    readonly entityId: string;
    readonly facts: string[];
    readonly embeddings?: number[][];
    readonly semanticMetadata: Record<string, any>;
    readonly provenance: {
        readonly sourceNodeId: string;
        readonly timestamp: Date;
        readonly lineageHashes: string[];
    };
    readonly version: string;
    readonly signature: string;
    readonly permissions: {
        readonly allowedNodes: string[];
        readonly allowedUses: ('inference' | 'learning' | 'reasoning')[];
    };
}
export interface ExperiencePackage {
    readonly id: string;
    readonly problem: string;
    readonly reasoningChain: string[];
    readonly actions: {
        actionType: string;
        payload: any;
    }[];
    readonly result: any;
    readonly confidence: number;
    readonly metadata: Record<string, any>;
    readonly signature: string;
    readonly sourceNodeId: string;
}
export interface ReasoningTask {
    readonly taskId: string;
    readonly prompt: string;
    readonly contextPackages: string[];
}
export interface ReasoningResponse {
    readonly nodeId: string;
    readonly responseText: string;
    readonly confidence: number;
    readonly signature: string;
}
export interface ConsensusVote {
    readonly nodeId: string;
    readonly approve: boolean;
    readonly confidence: number;
    readonly comment?: string;
}
export interface ReputationMetrics {
    readonly nodeId: string;
    trustScore: number;
    contributionCount: number;
    learningCount: number;
    availabilityRate: number;
    validationAccuracy: number;
    knowledgeQuality: number;
    reasoningAccuracy: number;
    packageQuality: number;
    participationRate: number;
}
export type CollaborationPolicyType = 'medical' | 'research' | 'government' | 'enterprise' | 'personal' | 'custom';
export interface CollaborationPolicy {
    readonly policyType: CollaborationPolicyType;
    readonly allowedSharingCategories: string[];
    readonly requiredTrustScore: number;
    readonly blockedNodes: string[];
    readonly enforceSignatures: boolean;
}
