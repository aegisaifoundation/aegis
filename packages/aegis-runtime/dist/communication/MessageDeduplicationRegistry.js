import { CommunicationError, CommunicationErrorCode } from '@aegis/sdk';
export class MessageDeduplicationRegistry {
    entries = new Map();
    maxEntries;
    constructor(maxEntries = 10000) {
        this.maxEntries = maxEntries;
    }
    makeKey(senderNodeId, messageId) {
        return `${senderNodeId}:${messageId}`;
    }
    isDuplicate(senderNodeId, messageId) {
        this.cleanupExpiredEntries();
        const key = this.makeKey(senderNodeId, messageId);
        const entry = this.entries.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.entries.delete(key);
            return false;
        }
        return true;
    }
    register(senderNodeId, messageId, ttlMs = 60000) {
        this.cleanupExpiredEntries();
        const key = this.makeKey(senderNodeId, messageId);
        if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
            throw new CommunicationError(CommunicationErrorCode.COMMUNICATION_CAPACITY_EXCEEDED, `MessageDeduplicationRegistry exceeded maximum capacity of ${this.maxEntries} entries.`);
        }
        this.entries.set(key, {
            key,
            senderNodeId,
            messageId,
            expiresAt: Date.now() + ttlMs
        });
    }
    cleanupExpiredEntries() {
        const now = Date.now();
        for (const [key, entry] of this.entries.entries()) {
            if (now > entry.expiresAt) {
                this.entries.delete(key);
            }
        }
    }
    getSize() {
        return this.entries.size;
    }
    clear() {
        this.entries.clear();
    }
}
