import { AEGIS_NET_PROTOCOL_VERSION, MessageRoute, CommunicationError, CommunicationErrorCode } from '@aegis/sdk';
export class MessageValidator {
    static validateNodeId(nodeId, label = 'nodeId') {
        if (!nodeId || typeof nodeId !== 'string' || !nodeId.startsWith('aegis://')) {
            throw new CommunicationError(CommunicationErrorCode.INVALID_NODE_ID, `Invalid ${label}: "${nodeId}". Must be a canonical identity starting with "aegis://".`);
        }
    }
    static validateEnvelope(envelope) {
        if (!envelope || typeof envelope !== 'object') {
            throw new CommunicationError(CommunicationErrorCode.INVALID_MESSAGE, 'Message envelope must be a non-null object.');
        }
        // 1. Protocol Version
        if (envelope.protocolVersion !== AEGIS_NET_PROTOCOL_VERSION) {
            throw new CommunicationError(CommunicationErrorCode.PROTOCOL_MISMATCH, `Protocol version mismatch. Required: "${AEGIS_NET_PROTOCOL_VERSION}", received: "${envelope.protocolVersion}".`);
        }
        // 2. Message Identity
        if (!envelope.messageId || typeof envelope.messageId !== 'string' || !envelope.messageId.startsWith('aegis-msg://')) {
            throw new CommunicationError(CommunicationErrorCode.INVALID_MESSAGE, `Invalid messageId: "${envelope.messageId}". Must start with "aegis-msg://".`);
        }
        // 3. Sender Identity
        this.validateNodeId(envelope.senderNodeId, 'senderNodeId');
        // 4. Target Identity (if provided)
        if (envelope.targetNodeId !== undefined && envelope.targetNodeId !== null && envelope.targetNodeId !== '') {
            this.validateNodeId(envelope.targetNodeId, 'targetNodeId');
        }
        // 5. Message Type
        if (!envelope.messageType || typeof envelope.messageType !== 'string' || envelope.messageType.trim() === '') {
            throw new CommunicationError(CommunicationErrorCode.INVALID_MESSAGE, 'Message envelope missing valid messageType string.');
        }
        // 6. Timestamp & Expiration
        if (typeof envelope.timestamp !== 'number' || envelope.timestamp <= 0) {
            throw new CommunicationError(CommunicationErrorCode.INVALID_MESSAGE, `Invalid timestamp: ${envelope.timestamp}`);
        }
        const expiresAt = envelope.expiresAt || (envelope.ttl ? envelope.timestamp + envelope.ttl : envelope.timestamp + 30000);
        if (Date.now() > expiresAt) {
            throw new CommunicationError(CommunicationErrorCode.MESSAGE_EXPIRED, `Message "${envelope.messageId}" expired at ${new Date(expiresAt).toISOString()} (Current: ${new Date().toISOString()}).`);
        }
        // 7. Routing Semantics Validation
        if (envelope.route === MessageRoute.LOCAL && envelope.targetNodeId && envelope.targetNodeId !== envelope.senderNodeId) {
            // Local route targeting a different remote node ID is invalid
        }
        return envelope;
    }
}
