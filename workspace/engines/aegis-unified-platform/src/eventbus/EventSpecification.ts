import { EventBus } from '@aegis/runtime';
import crypto from 'crypto';
import { PlatformEvent } from '../types/index.js';

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
} as const;

export class EventSpecification {
  static createEvent<T = any>(
    eventType: keyof typeof PlatformEventTypes,
    sourceEngine: string,
    payload: T,
    options: {
      correlationId?: string;
      sessionId?: string;
      nodeId?: string;
      priority?: PlatformEvent['priority'];
    } = {}
  ): PlatformEvent<T> {
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

  static publishEvent(bus: any, event: PlatformEvent): void {
    if (!bus) return;
    // Emit standard EventBus envelope
    bus.emit(event.eventType, event);
    bus.emit('platform.event', event);
  }
}
