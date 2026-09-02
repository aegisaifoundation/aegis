import { CommunicationError, CommunicationErrorCode } from '@aegis/sdk';
export class AckManager {
    maxPendingAcks;
    pendingAcks = new Map();
    constructor(maxPendingAcks = 5000) {
        this.maxPendingAcks = maxPendingAcks;
    }
    registerPendingAck(messageId, timeoutMs = 5000) {
        if (this.pendingAcks.has(messageId)) {
            throw new CommunicationError(CommunicationErrorCode.INVALID_MESSAGE, `Pending ACK registration already exists for messageId "${messageId}".`);
        }
        if (this.pendingAcks.size >= this.maxPendingAcks) {
            throw new CommunicationError(CommunicationErrorCode.COMMUNICATION_CAPACITY_EXCEEDED, `AckManager exceeded maximum capacity of ${this.maxPendingAcks} pending ACKs.`);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingAcks.delete(messageId);
                reject(new CommunicationError(CommunicationErrorCode.ACK_TIMEOUT, `ACK timeout after ${timeoutMs}ms for messageId "${messageId}".`));
            }, timeoutMs);
            this.pendingAcks.set(messageId, {
                messageId,
                resolve,
                reject,
                timer
            });
        });
    }
    resolveAck(acknowledgedMessageId, ackEnvelope) {
        const pending = this.pendingAcks.get(acknowledgedMessageId);
        if (!pending)
            return false;
        clearTimeout(pending.timer);
        this.pendingAcks.delete(acknowledgedMessageId);
        pending.resolve(ackEnvelope);
        return true;
    }
    rejectAck(messageId, error) {
        const pending = this.pendingAcks.get(messageId);
        if (!pending)
            return false;
        clearTimeout(pending.timer);
        this.pendingAcks.delete(messageId);
        pending.reject(error);
        return true;
    }
    hasPendingAck(messageId) {
        return this.pendingAcks.has(messageId);
    }
    getSize() {
        return this.pendingAcks.size;
    }
    clear() {
        for (const pending of this.pendingAcks.values()) {
            clearTimeout(pending.timer);
        }
        this.pendingAcks.clear();
    }
}
