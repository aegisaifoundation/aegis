import { IAegisMessageEnvelope } from '@aegis/sdk';
export declare class RequestCorrelationManager {
    private readonly maxPendingRequests;
    private pendingRequests;
    constructor(maxPendingRequests?: number);
    registerPendingRequest(correlationId: string, timeoutMs?: number): Promise<IAegisMessageEnvelope>;
    resolveRequest(correlationId: string, responseEnvelope: IAegisMessageEnvelope): boolean;
    rejectRequest(correlationId: string, error: Error): boolean;
    hasPendingRequest(correlationId: string): boolean;
    getSize(): number;
    clear(): void;
}
