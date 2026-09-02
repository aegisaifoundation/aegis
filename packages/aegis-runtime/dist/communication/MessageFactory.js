import { randomUUID } from 'crypto';
import { AEGIS_NET_PROTOCOL_VERSION, MessagePriority, MessageRoute, MessageTypeCategory, CommunicationError, CommunicationErrorCode } from '@aegis/sdk';
export class MessageFactory {
    senderNodeId;
    constructor(senderNodeId) {
        this.senderNodeId = senderNodeId;
        if (!senderNodeId || typeof senderNodeId !== 'string' || !senderNodeId.startsWith('aegis://')) {
            throw new CommunicationError(CommunicationErrorCode.INVALID_NODE_ID, `MessageFactory requires a valid canonical senderNodeId starting with "aegis://". Received: "${senderNodeId}"`);
        }
    }
    getSenderNodeId() {
        return this.senderNodeId;
    }
    createMessage(options) {
        const timestamp = Date.now();
        const ttl = options.ttlMs && options.ttlMs > 0 ? options.ttlMs : 30000; // Default 30s TTL
        const expiresAt = timestamp + ttl;
        const messageId = `aegis-msg://${randomUUID()}`;
        // Infer routing mode if not provided
        let route = options.route;
        if (!route) {
            if (options.targetNodeId === this.senderNodeId || !options.targetNodeId) {
                route = MessageRoute.LOCAL;
            }
            else {
                route = MessageRoute.DIRECT;
            }
        }
        return {
            protocolVersion: AEGIS_NET_PROTOCOL_VERSION,
            messageId,
            correlationId: options.correlationId,
            acknowledgedMessageId: options.acknowledgedMessageId,
            messageType: options.messageType,
            senderNodeId: this.senderNodeId,
            targetNodeId: options.targetNodeId,
            sourceEngine: options.sourceEngine,
            targetEngine: options.targetEngine,
            route,
            timestamp,
            ttl,
            expiresAt,
            priority: options.priority ?? MessagePriority.NORMAL,
            requiresAck: options.requiresAck ?? false,
            payload: options.payload
        };
    }
    createRequest(options) {
        return this.createMessage({
            ...options,
            messageType: options.messageType.startsWith('REQUEST.') || options.messageType.startsWith('ENGINE.')
                ? options.messageType
                : `${MessageTypeCategory.REQUEST}.${options.messageType}`,
            requiresAck: options.requiresAck ?? true
        });
    }
    createResponse(requestEnvelope, payload, sourceEngine) {
        return this.createMessage({
            messageType: `${MessageTypeCategory.RESPONSE}.${requestEnvelope.messageType}`,
            payload,
            targetNodeId: requestEnvelope.senderNodeId,
            targetEngine: requestEnvelope.sourceEngine,
            sourceEngine: sourceEngine || requestEnvelope.targetEngine,
            correlationId: requestEnvelope.messageId,
            requiresAck: false,
            priority: requestEnvelope.priority
        });
    }
    createAck(targetMessageEnvelope) {
        return this.createMessage({
            messageType: `${MessageTypeCategory.SYSTEM}.ACK`,
            payload: { status: 'ACCEPTED', receivedAt: Date.now() },
            targetNodeId: targetMessageEnvelope.senderNodeId,
            targetEngine: targetMessageEnvelope.sourceEngine,
            sourceEngine: targetMessageEnvelope.targetEngine,
            acknowledgedMessageId: targetMessageEnvelope.messageId,
            requiresAck: false,
            priority: MessagePriority.CRITICAL
        });
    }
    createError(targetMessageEnvelope, errorCode, errorMessage) {
        return this.createMessage({
            messageType: `${MessageTypeCategory.SYSTEM}.ERROR`,
            payload: { code: errorCode, message: errorMessage },
            targetNodeId: targetMessageEnvelope.senderNodeId,
            targetEngine: targetMessageEnvelope.sourceEngine,
            sourceEngine: targetMessageEnvelope.targetEngine,
            correlationId: targetMessageEnvelope.messageId,
            requiresAck: false,
            priority: MessagePriority.HIGH
        });
    }
}
