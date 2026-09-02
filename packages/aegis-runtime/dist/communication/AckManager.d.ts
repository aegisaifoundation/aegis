import { IAegisMessageEnvelope } from '@aegis/sdk';
export declare class AckManager {
    private readonly maxPendingAcks;
    private pendingAcks;
    constructor(maxPendingAcks?: number);
    registerPendingAck(messageId: string, timeoutMs?: number): Promise<IAegisMessageEnvelope>;
    resolveAck(acknowledgedMessageId: string, ackEnvelope: IAegisMessageEnvelope): boolean;
    rejectAck(messageId: string, error: Error): boolean;
    hasPendingAck(messageId: string): boolean;
    getSize(): number;
    clear(): void;
}
