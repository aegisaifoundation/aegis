import { EventEnvelope } from './EventPayloads.js';
export type EventListener<T = any> = (envelope: EventEnvelope<T>) => void | Promise<void>;
export declare class EventBus {
    private listeners;
    on<T = any>(event: string, listener: EventListener<T>): void;
    off<T = any>(event: string, listener: EventListener<T>): void;
    once<T = any>(event: string, listener: EventListener<T>): void;
    emit<T = any>(event: string, payloadOrEnvelope?: T | EventEnvelope<T>, source?: string): void;
}
export declare const eventBus: EventBus;
