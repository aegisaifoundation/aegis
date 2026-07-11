export interface EventEnvelope<T = any> {
    event: string;
    timestamp: number;
    source: string;
    payload: T;
}
export type EventListener<T = any> = (envelope: EventEnvelope<T>) => void | Promise<void>;
export interface IEventBus {
    on<T = any>(event: string, listener: EventListener<T>): void;
    off<T = any>(event: string, listener: EventListener<T>): void;
    once<T = any>(event: string, listener: EventListener<T>): void;
    emit<T = any>(event: string, payloadOrEnvelope?: T | EventEnvelope<T>, source?: string): void;
}
