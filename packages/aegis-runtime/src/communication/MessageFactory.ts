import { randomUUID } from 'crypto';
import {
  AEGIS_NET_PROTOCOL_VERSION,
  IAegisMessageEnvelope,
  MessagePriority,
  MessageRoute,
  MessageTypeCategory,
  CommunicationError,
  CommunicationErrorCode
} from '@aegis/sdk';

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

export class MessageFactory {
  constructor(private readonly senderNodeId: string) {
    if (!senderNodeId || typeof senderNodeId !== 'string' || !senderNodeId.startsWith('aegis://')) {
      throw new CommunicationError(
        CommunicationErrorCode.INVALID_NODE_ID,
        `MessageFactory requires a valid canonical senderNodeId starting with "aegis://". Received: "${senderNodeId}"`
      );
    }
  }

  getSenderNodeId(): string {
    return this.senderNodeId;
  }

  createMessage<T = any>(options: CreateMessageOptions<T>): IAegisMessageEnvelope<T> {
    const timestamp = Date.now();
    const ttl = options.ttlMs && options.ttlMs > 0 ? options.ttlMs : 30000; // Default 30s TTL
    const expiresAt = timestamp + ttl;

    const messageId = `aegis-msg://${randomUUID()}`;

    // Infer routing mode if not provided
    let route = options.route;
    if (!route) {
      if (options.targetNodeId === this.senderNodeId || !options.targetNodeId) {
        route = MessageRoute.LOCAL;
      } else {
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

  createRequest<T = any>(options: CreateMessageOptions<T>): IAegisMessageEnvelope<T> {
    return this.createMessage({
      ...options,
      messageType: options.messageType.startsWith('REQUEST.') || options.messageType.startsWith('ENGINE.')
        ? options.messageType
        : `${MessageTypeCategory.REQUEST}.${options.messageType}`,
      requiresAck: options.requiresAck ?? true
    });
  }

  createResponse<T = any>(
    requestEnvelope: IAegisMessageEnvelope,
    payload: T,
    sourceEngine?: string
  ): IAegisMessageEnvelope<T> {
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

  createAck(
    targetMessageEnvelope: IAegisMessageEnvelope
  ): IAegisMessageEnvelope<{ status: 'ACCEPTED'; receivedAt: number }> {
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

  createError(
    targetMessageEnvelope: IAegisMessageEnvelope,
    errorCode: CommunicationErrorCode,
    errorMessage: string
  ): IAegisMessageEnvelope<{ code: string; message: string }> {
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
