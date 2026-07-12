import { memoryReflectionManager } from '../../refinement/MemoryReflectionManager.js';
export class ReflectionHandler {
    static async handleEvent(event) {
        const { sessionId, actor, topic } = event;
        try {
            console.log(`[ReflectionHandler] Session event triggered reflection loop for topic ${topic} inside session ${sessionId}`);
            await memoryReflectionManager.reflect(sessionId, actor);
        }
        catch (err) {
            console.error('[ReflectionHandler] Failed to run automated reflection:', err);
        }
    }
}
