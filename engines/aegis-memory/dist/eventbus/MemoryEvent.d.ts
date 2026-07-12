export interface MemoryEvent<T = any> {
    eventId: string;
    topic: string;
    timestamp: string;
    sessionId: string;
    actor: string;
    payload: T;
}
