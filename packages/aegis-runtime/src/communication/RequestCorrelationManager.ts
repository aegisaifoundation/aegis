import {
  IAegisMessageEnvelope,
  MessageTypeCategory,
  CommunicationError,
  CommunicationErrorCode
} from '@aegis/sdk';

interface PendingRequest {
  correlationId: string;
  resolve: (responseEnvelope: IAegisMessageEnvelope) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class RequestCorrelationManager {
  private pendingRequests = new Map<string, PendingRequest>();

  constructor(private readonly maxPendingRequests: number = 5000) {}

  registerPendingRequest(correlationId: string, timeoutMs: number = 10000): Promise<IAegisMessageEnvelope> {
    if (this.pendingRequests.has(correlationId)) {
      throw new CommunicationError(
        CommunicationErrorCode.INVALID_MESSAGE,
        `Pending request correlation already exists for correlationId "${correlationId}".`
      );
    }

    if (this.pendingRequests.size >= this.maxPendingRequests) {
      throw new CommunicationError(
        CommunicationErrorCode.COMMUNICATION_CAPACITY_EXCEEDED,
        `RequestCorrelationManager exceeded maximum capacity of ${this.maxPendingRequests} pending requests.`
      );
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(
          new CommunicationError(
            CommunicationErrorCode.REQUEST_TIMEOUT,
            `Request correlation timeout after ${timeoutMs}ms for correlationId "${correlationId}".`
          )
        );
      }, timeoutMs);

      this.pendingRequests.set(correlationId, {
        correlationId,
        resolve,
        reject,
        timer
      });
    });
  }

  resolveRequest(correlationId: string, responseEnvelope: IAegisMessageEnvelope): boolean {
    if (responseEnvelope.messageType === `${MessageTypeCategory.SYSTEM}.ACK` || responseEnvelope.messageType.endsWith('.ACK')) {
      return false;
    }

    const pending = this.pendingRequests.get(correlationId);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(correlationId);
    pending.resolve(responseEnvelope);
    return true;
  }

  rejectRequest(correlationId: string, error: Error): boolean {
    const pending = this.pendingRequests.get(correlationId);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(correlationId);
    pending.reject(error);
    return true;
  }

  hasPendingRequest(correlationId: string): boolean {
    return this.pendingRequests.has(correlationId);
  }

  getSize(): number {
    return this.pendingRequests.size;
  }

  clear(): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingRequests.clear();
  }
}
