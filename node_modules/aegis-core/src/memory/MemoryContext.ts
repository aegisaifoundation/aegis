import { EventBus } from '../events/EventBus.js';
import { Logger } from '../runtime/RuntimeContext.js';

export interface MemoryContext {
  eventBus: EventBus;
  logger: Logger;
  config: any;
  workspacePath: string;
}
