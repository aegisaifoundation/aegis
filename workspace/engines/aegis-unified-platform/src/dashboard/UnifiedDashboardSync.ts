import { unifiedMonitor } from '../monitoring/UnifiedMonitor.js';
import { EventSpecification } from '../eventbus/EventSpecification.js';
import { UnifiedPlatformStatus } from '../types/index.js';

export class UnifiedDashboardSync {
  private eventBus: any = null;
  private lastStatus: UnifiedPlatformStatus | null = null;

  constructor(eventBus?: any) {
    this.eventBus = eventBus;
  }

  initialize(eventBus: any): void {
    this.eventBus = eventBus;
    this.registerListeners();
    console.log('[UnifiedDashboardSync] Initialized live synchronization listeners.');
  }

  private registerListeners(): void {
    if (!this.eventBus) return;

    // Listen to key platform events to trigger sync
    const triggerEvents = [
      'NodeStarted',
      'NodeStopped',
      'EngineInstalled',
      'EngineDetached',
      'TrainingStarted',
      'TrainingCompleted',
      'LearningRoundCreated',
      'LearningRoundCompleted',
      'InferenceStarted',
      'InferenceCompleted',
      'PackageInstalled',
      'PackageRemoved'
    ];

    for (const eventName of triggerEvents) {
      this.eventBus.on(eventName, async () => {
        await this.syncAndBroadcast();
      });
    }
  }

  async syncAndBroadcast(): Promise<UnifiedPlatformStatus> {
    const status = await unifiedMonitor.getPlatformStatus();
    this.lastStatus = status;

    if (this.eventBus) {
      const event = EventSpecification.createEvent(
        'RecommendationGenerated', // Using an event from PlatformEventTypes list or dashboard updated
        'aegis-unified-platform',
        { status },
        { priority: 'NORMAL' }
      );
      // Emit update
      this.eventBus.emit('dashboard.update', status);
      EventSpecification.publishEvent(this.eventBus, event);
    }

    return status;
  }

  getLastStatus(): UnifiedPlatformStatus | null {
    return this.lastStatus;
  }
}

export const unifiedDashboardSync = new UnifiedDashboardSync();
export default unifiedDashboardSync;
