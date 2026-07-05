import { EventEnvelope } from './EventPayloads.js';

export type EventListener<T = any> = (envelope: EventEnvelope<T>) => void | Promise<void>;

export class EventBus {
  private listeners = new Map<string, Set<EventListener>>();

  on<T = any>(event: string, listener: EventListener<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<T = any>(event: string, listener: EventListener<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  once<T = any>(event: string, listener: EventListener<T>): void {
    const wrapper: EventListener<T> = (envelope: EventEnvelope<T>) => {
      this.off(event, wrapper);
      return listener(envelope);
    };
    this.on(event, wrapper);
  }

  emit<T = any>(event: string, payloadOrEnvelope?: T | EventEnvelope<T>, source?: string): void {
    let envelope: EventEnvelope<T>;

    if (
      payloadOrEnvelope &&
      typeof payloadOrEnvelope === 'object' &&
      'event' in payloadOrEnvelope &&
      'timestamp' in payloadOrEnvelope &&
      'source' in payloadOrEnvelope &&
      'payload' in payloadOrEnvelope
    ) {
      envelope = payloadOrEnvelope as EventEnvelope<T>;
    } else {
      envelope = {
        event,
        timestamp: Date.now(),
        source: source || 'system',
        payload: payloadOrEnvelope as T,
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
        } catch (err) {
          console.error(`[EventBus] Sync listener error on event '${event}':`, err);
        }
      }
    }
  }
}

export const eventBus = new EventBus();
