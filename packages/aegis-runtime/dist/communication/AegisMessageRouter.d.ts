import { IAegisMessageEnvelope, MessageDeliveryState } from '@aegis/sdk';
import { MessageFactory } from './MessageFactory.js';
import { MessageDeduplicationRegistry } from './MessageDeduplicationRegistry.js';
import { AckManager } from './AckManager.js';
import { RequestCorrelationManager } from './RequestCorrelationManager.js';
import { AegisMessageBus } from './AegisMessageBus.js';
export interface ReliabilityPolicy {
    maxAttempts: number;
    ackTimeoutMs: number;
    retryable: boolean;
}
export declare class AegisMessageRouter {
    private readonly localNodeId;
    private readonly connectionManagerProvider;
    private factory;
    private deduplicationRegistry;
    private ackManager;
    private requestCorrelationManager;
    private localBus;
    private stateTracker;
    constructor(localNodeId: string, connectionManagerProvider: () => any);
    getFactory(): MessageFactory;
    getLocalBus(): AegisMessageBus;
    getDeduplicationRegistry(): MessageDeduplicationRegistry;
    getAckManager(): AckManager;
    getRequestCorrelationManager(): RequestCorrelationManager;
    getMessageState(messageId: string): MessageDeliveryState | undefined;
    private updateState;
    send(envelope: IAegisMessageEnvelope, policy?: Partial<ReliabilityPolicy>): Promise<void>;
    request<TRes = any, TReq = any>(targetNodeId: string, messageType: string, payload: TReq, options?: {
        targetEngine?: string;
        sourceEngine?: string;
        timeoutMs?: number;
    }): Promise<TRes>;
    handleIngressMessage(rawPacket: any, socket?: any): Promise<void>;
    private sendAck;
}
