import { EventSpecification } from '../eventbus/EventSpecification.js';
export class CapabilityRegistry {
    registry = new Map();
    eventBus = null;
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }
    registerCapabilities(engineId, cap) {
        const entry = {
            engineId,
            ...cap
        };
        this.registry.set(engineId, entry);
        if (this.eventBus) {
            const event = EventSpecification.createEvent('CapabilityInstalled', 'aegis-unified-platform', { engineId, capabilities: cap.capabilities }, { priority: 'NORMAL' });
            EventSpecification.publishEvent(this.eventBus, event);
        }
    }
    unregisterCapabilities(engineId) {
        if (this.registry.has(engineId)) {
            this.registry.delete(engineId);
            if (this.eventBus) {
                const event = EventSpecification.createEvent('CapabilityDiscovered', 'aegis-unified-platform', { engineId, action: 'removed' }, { priority: 'NORMAL' });
                EventSpecification.publishEvent(this.eventBus, event);
            }
        }
    }
    getCapabilities(engineId) {
        return this.registry.get(engineId);
    }
    listAllCapabilities() {
        return Array.from(this.registry.values());
    }
    clear() {
        this.registry.clear();
    }
}
export const capabilityRegistry = new CapabilityRegistry();
export default capabilityRegistry;
