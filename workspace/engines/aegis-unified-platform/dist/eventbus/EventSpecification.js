import crypto from 'crypto';
export const PlatformEventTypes = {
    NodeStarted: 'NodeStarted',
    NodeStopped: 'NodeStopped',
    EngineInstalled: 'EngineInstalled',
    EngineDetached: 'EngineDetached',
    DatasetCreated: 'DatasetCreated',
    DatasetValidated: 'DatasetValidated',
    TrainingStarted: 'TrainingStarted',
    TrainingProgress: 'TrainingProgress',
    TrainingCompleted: 'TrainingCompleted',
    CheckpointSaved: 'CheckpointSaved',
    LoRAExported: 'LoRAExported',
    LearningRoundCreated: 'LearningRoundCreated',
    LearningRoundCompleted: 'LearningRoundCompleted',
    SwarmLeaderElected: 'SwarmLeaderElected',
    KnowledgePublished: 'KnowledgePublished',
    KnowledgeValidated: 'KnowledgeValidated',
    InferenceStarted: 'InferenceStarted',
    InferenceCompleted: 'InferenceCompleted',
    CapabilityDiscovered: 'CapabilityDiscovered',
    CapabilityInstalled: 'CapabilityInstalled',
    PackageInstalled: 'PackageInstalled',
    PackageRemoved: 'PackageRemoved',
    TrustUpdated: 'TrustUpdated',
    PolicyViolation: 'PolicyViolation',
    ExperienceRecorded: 'ExperienceRecorded',
    RecommendationGenerated: 'RecommendationGenerated'
};
export class EventSpecification {
    static createEvent(eventType, sourceEngine, payload, options = {}) {
        return {
            correlationId: options.correlationId || `corr-${crypto.randomUUID()}`,
            sessionId: options.sessionId || `sess-default`,
            nodeId: options.nodeId || `node-123`,
            timestamp: new Date().toISOString(),
            sourceEngine,
            version: '1.0.0',
            priority: options.priority || 'NORMAL',
            eventType,
            payload
        };
    }
    static publishEvent(bus, event) {
        if (!bus)
            return;
        // Emit standard EventBus envelope
        bus.emit(event.eventType, event);
        bus.emit('platform.event', event);
    }
}
