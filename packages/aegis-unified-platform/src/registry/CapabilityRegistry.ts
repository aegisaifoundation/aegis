import { PlatformCapability } from '../types/index.js';
import { EventSpecification } from '../eventbus/EventSpecification.js';

export class CapabilityRegistry {
  private registry = new Map<string, PlatformCapability>();
  private eventBus: any = null;

  constructor(eventBus?: any) {
    this.eventBus = eventBus;
  }

  setEventBus(eventBus: any) {
    this.eventBus = eventBus;
  }

  registerCapabilities(engineId: string, cap: Omit<PlatformCapability, 'engineId'>): void {
    const entry: PlatformCapability = {
      engineId,
      ...cap
    };
    this.registry.set(engineId, entry);

    if (this.eventBus) {
      const event = EventSpecification.createEvent(
        'CapabilityInstalled',
        'aegis-unified-platform',
        { engineId, capabilities: cap.capabilities },
        { priority: 'NORMAL' }
      );
      EventSpecification.publishEvent(this.eventBus, event);
    }
  }

  unregisterCapabilities(engineId: string): void {
    if (this.registry.has(engineId)) {
      this.registry.delete(engineId);
      if (this.eventBus) {
        const event = EventSpecification.createEvent(
          'CapabilityDiscovered',
          'aegis-unified-platform',
          { engineId, action: 'removed' },
          { priority: 'NORMAL' }
        );
        EventSpecification.publishEvent(this.eventBus, event);
      }
    }
  }

  getCapabilities(engineId: string): PlatformCapability | undefined {
    return this.registry.get(engineId);
  }

  listAllCapabilities(): PlatformCapability[] {
    return Array.from(this.registry.values());
  }

  clear() {
    this.registry.clear();
  }
}

export const capabilityRegistry = new CapabilityRegistry();
export default capabilityRegistry;
