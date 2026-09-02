import { MessageTypeCategory, CommunicationError, CommunicationErrorCode } from '@aegis/sdk';
export class RequestCorrelationManager {
    maxPendingRequests;
    pendingRequests = new Map();
    constructor(maxPendingRequests = 5000) {
        this.maxPendingRequests = maxPendingRequests;
    }
    registerPendingRequest(correlationId, timeoutMs = 10000) {
        if (this.pendingRequests.has(correlationId)) {
            throw new CommunicationError(CommunicationErrorCode.INVALID_MESSAGE, `Pending request correlation already exists for correlationId "${correlationId}".`);
        }
        if (this.pendingRequests.size >= this.maxPendingRequests) {
            throw new CommunicationError(CommunicationErrorCode.COMMUNICATION_CAPACITY_EXCEEDED, `RequestCorrelationManager exceeded maximum capacity of ${this.maxPendingRequests} pending requests.`);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new CommunicationError(CommunicationErrorCode.REQUEST_TIMEOUT, `Request correlation timeout after ${timeoutMs}ms for correlationId "${correlationId}".`));
            }, timeoutMs);
            this.pendingRequests.set(correlationId, {
                correlationId,
                resolve,
                reject,
                timer
            });
        });
    }
    resolveRequest(correlationId, responseEnvelope) {
        if (responseEnvelope.messageType === `${MessageTypeCategory.SYSTEM}.ACK` || responseEnvelope.messageType.endsWith('.ACK')) {
            return false;
        }
        const pending = this.pendingRequests.get(correlationId);
        if (!pending)
            return false;
        clearTimeout(pending.timer);
        this.pendingRequests.delete(correlationId);
        pending.resolve(responseEnvelope);
        return true;
    }
    rejectRequest(correlationId, error) {
        const pending = this.pendingRequests.get(correlationId);
        if (!pending)
            return false;
        clearTimeout(pending.timer);
        this.pendingRequests.delete(correlationId);
        pending.reject(error);
        return true;
    }
    hasPendingRequest(correlationId) {
        return this.pendingRequests.has(correlationId);
    }
    getSize() {
        return this.pendingRequests.size;
    }
    clear() {
        for (const pending of this.pendingRequests.values()) {
            clearTimeout(pending.timer);
        }
        this.pendingRequests.clear();
    }
}
