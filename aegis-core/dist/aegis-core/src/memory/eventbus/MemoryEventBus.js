export class MemoryEventBus {
    static instance = new MemoryEventBus();
    subscribers = new Map();
    static getInstance() {
        return this.instance;
    }
    subscribe(topic, handler) {
        const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Map());
        }
        this.subscribers.get(topic).set(subId, handler);
        return subId;
    }
    unsubscribe(subscriptionId) {
        for (const [topic, handlersMap] of this.subscribers.entries()) {
            if (handlersMap.has(subscriptionId)) {
                handlersMap.delete(subscriptionId);
                if (handlersMap.size === 0) {
                    this.subscribers.delete(topic);
                }
                break;
            }
        }
    }
    publish(event) {
        // Exact match handlers
        this.dispatch(event.topic, event);
        // Wildcard match handlers (e.g. '*')
        this.dispatch('*', event);
        // Namespace wildcard match (e.g. 'session.*' matches 'session.created')
        if (event.topic.includes('.')) {
            const parts = event.topic.split('.');
            if (parts.length > 0) {
                this.dispatch(`${parts[0]}.*`, event);
            }
        }
    }
    dispatch(topicPattern, event) {
        const handlersMap = this.subscribers.get(topicPattern);
        if (handlersMap) {
            for (const handler of handlersMap.values()) {
                Promise.resolve().then(async () => {
                    try {
                        await handler(event);
                    }
                    catch (err) {
                        console.error(`[MemoryEventBus] Error in handler for topic ${topicPattern}:`, err);
                    }
                });
            }
        }
    }
}
export const memoryEventBus = MemoryEventBus.getInstance();
