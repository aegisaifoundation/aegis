import {
  IAegisMessageEnvelope,
  CommunicationError,
  CommunicationErrorCode
} from '@aegis/sdk';

interface PendingAck {
  messageId: string;
  resolve: (ackEnvelope: IAegisMessageEnvelope) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class AckManager {
  private pendingAcks = new Map<string, PendingAck>();

  constructor(private readonly maxPendingAcks: number = 5000) {}

  registerPendingAck(messageId: string, timeoutMs: number = 5000): Promise<IAegisMessageEnvelope> {
    if (this.pendingAcks.has(messageId)) {
      throw new CommunicationError(
        CommunicationErrorCode.INVALID_MESSAGE,
        `Pending ACK registration already exists for messageId "${messageId}".`
      );
    }

    if (this.pendingAcks.size >= this.maxPendingAcks) {
      throw new CommunicationError(
        CommunicationErrorCode.COMMUNICATION_CAPACITY_EXCEEDED,
        `AckManager exceeded maximum capacity of ${this.maxPendingAcks} pending ACKs.`
      );
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAcks.delete(messageId);
        reject(
          new CommunicationError(
            CommunicationErrorCode.ACK_TIMEOUT,
            `ACK timeout after ${timeoutMs}ms for messageId "${messageId}".`
          )
        );
      }, timeoutMs);

      this.pendingAcks.set(messageId, {
        messageId,
        resolve,
        reject,
        timer
      });
    });
  }

  resolveAck(acknowledgedMessageId: string, ackEnvelope: IAegisMessageEnvelope): boolean {
    const pending = this.pendingAcks.get(acknowledgedMessageId);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pendingAcks.delete(acknowledgedMessageId);
    pending.resolve(ackEnvelope);
    return true;
  }

  rejectAck(messageId: string, error: Error): boolean {
    const pending = this.pendingAcks.get(messageId);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pendingAcks.delete(messageId);
    pending.reject(error);
    return true;
  }

  hasPendingAck(messageId: string): boolean {
    return this.pendingAcks.has(messageId);
  }

  getSize(): number {
    return this.pendingAcks.size;
  }

  clear(): void {
    for (const pending of this.pendingAcks.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingAcks.clear();
  }
}
