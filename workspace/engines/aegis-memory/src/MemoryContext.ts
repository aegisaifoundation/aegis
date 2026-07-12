import { EventBus, Logger } from '@aegis/runtime';

export interface MemoryContext {
  eventBus: EventBus;
  logger: Logger;
  config: any;
  workspacePath: string;
}
