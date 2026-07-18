import { PlatformEvent } from '../types/index.js';
export declare const PlatformEventTypes: {
    readonly NodeStarted: "NodeStarted";
    readonly NodeStopped: "NodeStopped";
    readonly EngineInstalled: "EngineInstalled";
    readonly EngineDetached: "EngineDetached";
    readonly DatasetCreated: "DatasetCreated";
    readonly DatasetValidated: "DatasetValidated";
    readonly TrainingStarted: "TrainingStarted";
    readonly TrainingProgress: "TrainingProgress";
    readonly TrainingCompleted: "TrainingCompleted";
    readonly CheckpointSaved: "CheckpointSaved";
    readonly LoRAExported: "LoRAExported";
    readonly LearningRoundCreated: "LearningRoundCreated";
    readonly LearningRoundCompleted: "LearningRoundCompleted";
    readonly SwarmLeaderElected: "SwarmLeaderElected";
    readonly KnowledgePublished: "KnowledgePublished";
    readonly KnowledgeValidated: "KnowledgeValidated";
    readonly InferenceStarted: "InferenceStarted";
    readonly InferenceCompleted: "InferenceCompleted";
    readonly CapabilityDiscovered: "CapabilityDiscovered";
    readonly CapabilityInstalled: "CapabilityInstalled";
    readonly PackageInstalled: "PackageInstalled";
    readonly PackageRemoved: "PackageRemoved";
    readonly TrustUpdated: "TrustUpdated";
    readonly PolicyViolation: "PolicyViolation";
    readonly ExperienceRecorded: "ExperienceRecorded";
    readonly RecommendationGenerated: "RecommendationGenerated";
};
export declare class EventSpecification {
    static createEvent<T = any>(eventType: keyof typeof PlatformEventTypes, sourceEngine: string, payload: T, options?: {
        correlationId?: string;
        sessionId?: string;
        nodeId?: string;
        priority?: PlatformEvent['priority'];
    }): PlatformEvent<T>;
    static publishEvent(bus: any, event: PlatformEvent): void;
}
