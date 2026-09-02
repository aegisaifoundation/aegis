import { MessageDeliveryState, MessageRoute, MessageTypeCategory, CommunicationError, CommunicationErrorCode } from '@aegis/sdk';
import { MessageFactory } from './MessageFactory.js';
import { MessageValidator } from './MessageValidator.js';
import { MessageDeduplicationRegistry } from './MessageDeduplicationRegistry.js';
import { AckManager } from './AckManager.js';
import { RequestCorrelationManager } from './RequestCorrelationManager.js';
import { AegisMessageBus } from './AegisMessageBus.js';
export class AegisMessageRouter {
    localNodeId;
    connectionManagerProvider;
    factory;
    deduplicationRegistry = new MessageDeduplicationRegistry();
    ackManager = new AckManager();
    requestCorrelationManager = new RequestCorrelationManager();
    localBus = new AegisMessageBus();
    stateTracker = new Map();
    constructor(localNodeId, connectionManagerProvider) {
        this.localNodeId = localNodeId;
        this.connectionManagerProvider = connectionManagerProvider;
        MessageValidator.validateNodeId(localNodeId, 'localNodeId');
        this.factory = new MessageFactory(localNodeId);
    }
    getFactory() {
        return this.factory;
    }
    getLocalBus() {
        return this.localBus;
    }
    getDeduplicationRegistry() {
        return this.deduplicationRegistry;
    }
    getAckManager() {
        return this.ackManager;
    }
    getRequestCorrelationManager() {
        return this.requestCorrelationManager;
    }
    getMessageState(messageId) {
        return this.stateTracker.get(messageId);
    }
    updateState(messageId, state) {
        this.stateTracker.set(messageId, state);
    }
    async send(envelope, policy) {
        this.updateState(envelope.messageId, MessageDeliveryState.CREATED);
        // 1. Validate envelope
        MessageValidator.validateEnvelope(envelope);
        this.updateState(envelope.messageId, MessageDeliveryState.VALIDATED);
        this.updateState(envelope.messageId, MessageDeliveryState.ROUTING);
        const isLocal = !envelope.targetNodeId || envelope.targetNodeId === this.localNodeId || envelope.route === MessageRoute.LOCAL;
        if (isLocal) {
            // Local Delivery
            this.updateState(envelope.messageId, MessageDeliveryState.LOCAL_DELIVERY);
            try {
                await this.localBus.dispatch(envelope);
                this.updateState(envelope.messageId, MessageDeliveryState.COMPLETED);
            }
            catch (err) {
                this.updateState(envelope.messageId, MessageDeliveryState.FAILED);
                throw err;
            }
            return;
        }
        // Remote Delivery
        this.updateState(envelope.messageId, MessageDeliveryState.REMOTE_DELIVERY);
        const connMgr = this.connectionManagerProvider();
        if (!connMgr) {
            this.updateState(envelope.messageId, MessageDeliveryState.FAILED);
            throw new CommunicationError(CommunicationErrorCode.CONNECTION_UNAVAILABLE, 'ConnectionManager is not available in current runtime context.');
        }
        const maxAttempts = policy?.maxAttempts ?? (envelope.requiresAck ? 3 : 1);
        const ackTimeoutMs = policy?.ackTimeoutMs ?? 3000;
        let attempt = 0;
        let lastError = null;
        while (attempt < maxAttempts) {
            attempt++;
            try {
                if (envelope.requiresAck) {
                    this.updateState(envelope.messageId, MessageDeliveryState.WAITING_FOR_ACK);
                    const ackPromise = this.ackManager.registerPendingAck(envelope.messageId, ackTimeoutMs);
                    // Send raw payload envelope string
                    await connMgr.sendPeerMessage(envelope.targetNodeId, envelope.messageType, envelope);
                    await ackPromise;
                    this.updateState(envelope.messageId, MessageDeliveryState.ACKNOWLEDGED);
                    this.updateState(envelope.messageId, MessageDeliveryState.COMPLETED);
                    return;
                }
                else {
                    await connMgr.sendPeerMessage(envelope.targetNodeId, envelope.messageType, envelope);
                    this.updateState(envelope.messageId, MessageDeliveryState.COMPLETED);
                    return;
                }
            }
            catch (err) {
                lastError = err;
                console.warn(`[AegisMessageRouter] Send attempt ${attempt}/${maxAttempts} failed for message ${envelope.messageId}: ${err.message}`);
                if (envelope.requiresAck) {
                    this.ackManager.rejectAck(envelope.messageId, err);
                }
            }
        }
        this.updateState(envelope.messageId, MessageDeliveryState.FAILED);
        throw new CommunicationError(CommunicationErrorCode.DELIVERY_FAILED, `Failed to deliver message ${envelope.messageId} to ${envelope.targetNodeId} after ${maxAttempts} attempt(s): ${lastError?.message}`, { attempts: maxAttempts, lastError: lastError?.message });
    }
    async request(targetNodeId, messageType, payload, options) {
        const envelope = this.factory.createRequest({
            messageType,
            payload,
            targetNodeId,
            targetEngine: options?.targetEngine,
            sourceEngine: options?.sourceEngine,
            requiresAck: false
        });
        const timeoutMs = options?.timeoutMs ?? 10000;
        const responsePromise = this.requestCorrelationManager.registerPendingRequest(envelope.messageId, timeoutMs);
        await this.send(envelope);
        const responseEnvelope = await responsePromise;
        return responseEnvelope.payload;
    }
    async handleIngressMessage(rawPacket, socket) {
        let envelope;
        // Check if rawPacket is already an envelope or wrapped payload
        if (rawPacket.protocolVersion && rawPacket.messageId) {
            envelope = rawPacket;
        }
        else if (rawPacket.payload && rawPacket.payload.protocolVersion && rawPacket.payload.messageId) {
            envelope = rawPacket.payload;
        }
        else {
            const fallbackSender = rawPacket.senderId || rawPacket.senderNodeId;
            envelope = this.factory.createMessage({
                messageType: rawPacket.messageType || 'UNKNOWN',
                payload: rawPacket.payload !== undefined ? rawPacket.payload : rawPacket,
                targetNodeId: this.localNodeId
            });
            if (fallbackSender && fallbackSender.startsWith('aegis://')) {
                envelope.senderNodeId = fallbackSender;
            }
        }
        try {
            MessageValidator.validateEnvelope(envelope);
        }
        catch (err) {
            console.warn(`[AegisMessageRouter] Dropped invalid ingress frame: ${err.message}`);
            return;
        }
        // 1. Check Expiration
        if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
            console.warn(`[AegisMessageRouter] Dropped expired ingress message ${envelope.messageId}`);
            this.updateState(envelope.messageId, MessageDeliveryState.EXPIRED);
            return;
        }
        // 2. Check Deduplication
        const isDuplicate = this.deduplicationRegistry.isDuplicate(envelope.senderNodeId, envelope.messageId);
        if (isDuplicate) {
            console.log(`[AegisMessageRouter] Recognized duplicate message ${envelope.messageId} from ${envelope.senderNodeId}`);
            // Duplicate message handling: DO NOT re-execute payload, BUT DO re-send ACK if requested!
            if (envelope.requiresAck) {
                await this.sendAck(envelope);
            }
            return;
        }
        // Register in deduplication registry
        this.deduplicationRegistry.register(envelope.senderNodeId, envelope.messageId, envelope.ttl || 60000);
        // 3. ACK Frame Ingress Handling (SYSTEM.ACK)
        if (envelope.messageType === `${MessageTypeCategory.SYSTEM}.ACK` && envelope.acknowledgedMessageId) {
            const resolved = this.ackManager.resolveAck(envelope.acknowledgedMessageId, envelope);
            if (resolved) {
                console.log(`[AegisMessageRouter] Resolved pending ACK for message ${envelope.acknowledgedMessageId}`);
                return;
            }
        }
        // 4. Response Frame Ingress Handling (RESPONSE.*)
        if (envelope.messageType.startsWith(`${MessageTypeCategory.RESPONSE}.`) && envelope.correlationId) {
            const resolved = this.requestCorrelationManager.resolveRequest(envelope.correlationId, envelope);
            if (resolved) {
                console.log(`[AegisMessageRouter] Resolved pending request correlation ${envelope.correlationId}`);
                return;
            }
        }
        // 5. Send ACK to sender if required
        if (envelope.requiresAck) {
            await this.sendAck(envelope);
        }
        // 6. Deliver to Local Message Bus
        try {
            await this.localBus.dispatch(envelope);
        }
        catch (err) {
            console.error(`[AegisMessageRouter] Local dispatch failed for message ${envelope.messageId}: ${err.message}`);
        }
    }
    async sendAck(targetEnvelope) {
        const ackEnvelope = this.factory.createAck(targetEnvelope);
        const connMgr = this.connectionManagerProvider();
        if (targetEnvelope.senderNodeId === this.localNodeId) {
            await this.localBus.dispatch(ackEnvelope);
        }
        else if (connMgr) {
            try {
                await connMgr.sendPeerMessage(targetEnvelope.senderNodeId, ackEnvelope.messageType, ackEnvelope);
            }
            catch (err) {
                console.warn(`[AegisMessageRouter] Failed to send ACK back to ${targetEnvelope.senderNodeId}: ${err.message}`);
            }
        }
    }
}
