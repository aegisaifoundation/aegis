import { CommunicationError, CommunicationErrorCode } from '@aegis/sdk';

interface DeduplicationEntry {
  key: string;
  senderNodeId: string;
  messageId: string;
  expiresAt: number;
}

export class MessageDeduplicationRegistry {
  private entries = new Map<string, DeduplicationEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  private makeKey(senderNodeId: string, messageId: string): string {
    return `${senderNodeId}:${messageId}`;
  }

  isDuplicate(senderNodeId: string, messageId: string): boolean {
    this.cleanupExpiredEntries();
    const key = this.makeKey(senderNodeId, messageId);
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  register(senderNodeId: string, messageId: string, ttlMs: number = 60000): void {
    this.cleanupExpiredEntries();
    const key = this.makeKey(senderNodeId, messageId);

    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      throw new CommunicationError(
        CommunicationErrorCode.COMMUNICATION_CAPACITY_EXCEEDED,
        `MessageDeduplicationRegistry exceeded maximum capacity of ${this.maxEntries} entries.`
      );
    }

    this.entries.set(key, {
      key,
      senderNodeId,
      messageId,
      expiresAt: Date.now() + ttlMs
    });
  }

  cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.expiresAt) {
        this.entries.delete(key);
      }
    }
  }

  getSize(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}
