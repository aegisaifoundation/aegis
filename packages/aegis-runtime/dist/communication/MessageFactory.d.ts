import { IAegisMessageEnvelope, MessagePriority, MessageRoute, CommunicationErrorCode } from '@aegis/sdk';
export interface CreateMessageOptions<T = any> {
    messageType: string;
    payload: T;
    targetNodeId?: string;
    sourceEngine?: string;
    targetEngine?: string;
    route?: MessageRoute;
    correlationId?: string;
    acknowledgedMessageId?: string;
    ttlMs?: number;
    priority?: MessagePriority;
    requiresAck?: boolean;
}
export declare class MessageFactory {
    private readonly senderNodeId;
    constructor(senderNodeId: string);
    getSenderNodeId(): string;
    createMessage<T = any>(options: CreateMessageOptions<T>): IAegisMessageEnvelope<T>;
    createRequest<T = any>(options: CreateMessageOptions<T>): IAegisMessageEnvelope<T>;
    createResponse<T = any>(requestEnvelope: IAegisMessageEnvelope, payload: T, sourceEngine?: string): IAegisMessageEnvelope<T>;
    createAck(targetMessageEnvelope: IAegisMessageEnvelope): IAegisMessageEnvelope<{
        status: 'ACCEPTED';
        receivedAt: number;
    }>;
    createError(targetMessageEnvelope: IAegisMessageEnvelope, errorCode: CommunicationErrorCode, errorMessage: string): IAegisMessageEnvelope<{
        code: string;
        message: string;
    }>;
}
