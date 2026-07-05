export class EventBus {
    listeners = new Map();
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
    }
    off(event, listener) {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(listener);
            if (set.size === 0) {
                this.listeners.delete(event);
            }
        }
    }
    once(event, listener) {
        const wrapper = (envelope) => {
            this.off(event, wrapper);
            return listener(envelope);
        };
        this.on(event, wrapper);
    }
    emit(event, payloadOrEnvelope, source) {
        let envelope;
        if (payloadOrEnvelope &&
            typeof payloadOrEnvelope === 'object' &&
            'event' in payloadOrEnvelope &&
            'timestamp' in payloadOrEnvelope &&
            'source' in payloadOrEnvelope &&
            'payload' in payloadOrEnvelope) {
            envelope = payloadOrEnvelope;
        }
        else {
            envelope = {
                event,
                timestamp: Date.now(),
                source: source || 'system',
                payload: payloadOrEnvelope,
            };
        }
        const set = this.listeners.get(event);
        if (set) {
            const targets = Array.from(set);
            for (const listener of targets) {
                try {
                    const result = listener(envelope);
                    if (result instanceof Promise) {
                        result.catch(err => {
                            console.error(`[EventBus] Async listener error on event '${event}':`, err);
                        });
                    }
                }
                catch (err) {
                    console.error(`[EventBus] Sync listener error on event '${event}':`, err);
                }
            }
        }
    }
}
export const eventBus = new EventBus();
