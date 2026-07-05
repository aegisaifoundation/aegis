import { MemoryEvent } from '../MemoryEvent.js';
import { memoryReflectionManager } from '../../refinement/MemoryReflectionManager.js';

export class ReflectionHandler {
  public static async handleEvent(event: MemoryEvent): Promise<void> {
    const { sessionId, actor, topic } = event;
    try {
      console.log(`[ReflectionHandler] Session event triggered reflection loop for topic ${topic} inside session ${sessionId}`);
      await memoryReflectionManager.reflect(sessionId, actor);
    } catch (err) {
      console.error('[ReflectionHandler] Failed to run automated reflection:', err);
    }
  }
}
