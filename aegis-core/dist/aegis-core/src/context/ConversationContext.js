import { memoryManager } from '../memory/index.js';
export class ConversationContext {
    activeState = {};
    metadata = {};
    async addMessage(role, content, metadata) {
        await memoryManager.addMemory(role, content, metadata);
    }
    async getMessages() {
        return memoryManager.getMemories();
    }
    async clear() {
        await memoryManager.clear();
        this.activeState = {};
        this.metadata = {};
    }
    setActiveState(key, value) {
        this.activeState[key] = value;
    }
    getActiveState(key) {
        return this.activeState[key];
    }
    setMetadata(key, value) {
        this.metadata[key] = value;
    }
    getMetadata(key) {
        return this.metadata[key];
    }
}
export const conversationContext = new ConversationContext();
