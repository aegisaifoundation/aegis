export interface EventEnvelope<T = any> {
    event: string;
    timestamp: number;
    source: string;
    payload: T;
}
