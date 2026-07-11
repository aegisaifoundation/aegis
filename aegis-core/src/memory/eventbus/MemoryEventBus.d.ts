import { MemoryEvent } from './MemoryEvent.js';
export type MemoryEventHandler = (event: MemoryEvent) => void | Promise<void>;
export declare class MemoryEventBus {
    private static instance;
    private subscribers;
    static getInstance(): MemoryEventBus;
    subscribe(topic: string, handler: MemoryEventHandler): string;
    unsubscribe(subscriptionId: string): void;
    publish(event: MemoryEvent): void;
    private dispatch;
}
export declare const memoryEventBus: MemoryEventBus;
