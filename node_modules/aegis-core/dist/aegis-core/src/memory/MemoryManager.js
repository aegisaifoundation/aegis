import { SessionMemory } from './SessionMemory.js';
export class MemoryManager {
    sessionMemory = null;
    memories = [];
    constructor(sessionId = 'default') {
        try {
            this.sessionMemory = new SessionMemory(sessionId);
        }
        catch (e) {
            console.warn('MemoryManager running without persistence:', e);
        }
    }
    async init() {
        if (!this.sessionMemory)
            return;
        try {
            this.memories = await this.sessionMemory.load();
        }
        catch (e) {
            console.error('Failed to load memory sessions:', e);
            this.memories = [];
        }
    }
    async addMemory(role, content, metadata) {
        this.memories.push({
            role,
            content,
            timestamp: new Date().toISOString(),
            metadata,
        });
        await this.persist();
    }
    getMemories() {
        return this.memories;
    }
    async clear() {
        this.memories = [];
        await this.persist();
    }
    async persist() {
        if (!this.sessionMemory)
            return;
        try {
            await this.sessionMemory.save(this.memories);
        }
        catch (e) {
            console.error('Failed to persist memory:', e);
        }
    }
}
export const memoryManager = new MemoryManager();
