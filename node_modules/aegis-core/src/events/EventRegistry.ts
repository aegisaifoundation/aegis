import { EventTypes } from './EventTypes.js';

export interface EventMetadata {
  name: string;
  description: string;
  category?: string;
  validationHook?: (payload: any) => boolean;
}

export class EventRegistry {
  private registeredEvents = new Map<string, EventMetadata>();

  register(metadata: EventMetadata): void {
    this.registeredEvents.set(metadata.name, metadata);
  }

  get(name: string): EventMetadata | undefined {
    return this.registeredEvents.get(name);
  }

  has(name: string): boolean {
    return this.registeredEvents.has(name);
  }

  list(): EventMetadata[] {
    return Array.from(this.registeredEvents.values());
  }

  validate(name: string, payload: any): boolean {
    const meta = this.registeredEvents.get(name);
    if (meta && meta.validationHook) {
      return meta.validationHook(payload);
    }
    return true;
  }
}

export const eventRegistry = new EventRegistry();

// Pre-register standardized events
eventRegistry.register({ name: EventTypes.RUNTIME_STARTED, description: 'Fired when the AEGIS microkernel runtime bootstraps successfully' });
eventRegistry.register({ name: EventTypes.RUNTIME_SHUTDOWN, description: 'Fired when the AEGIS runtime is shutting down' });
eventRegistry.register({ name: EventTypes.PROVIDER_INITIALIZED, description: 'Fired when a model provider is initialized successfully' });
eventRegistry.register({ name: EventTypes.PROVIDER_FAILED, description: 'Fired when a model provider fails initialization' });
eventRegistry.register({ name: EventTypes.PLUGIN_LOADED, description: 'Fired when a plugin is successfully loaded and activated' });
eventRegistry.register({ name: EventTypes.PLUGIN_FAILED, description: 'Fired when a plugin fails to load or activate' });
eventRegistry.register({ name: EventTypes.SKILL_EXECUTED, description: 'Fired when a skill executes successfully' });
eventRegistry.register({ name: EventTypes.SKILL_FAILED, description: 'Fired when a skill fails during execution' });
eventRegistry.register({ name: EventTypes.MESSAGE_RECEIVED, description: 'Fired when a user or assistant message is added to the conversation context' });
eventRegistry.register({ name: EventTypes.EXECUTION_STARTED, description: 'Fired when the execution of user input starts' });
eventRegistry.register({ name: EventTypes.EXECUTION_COMPLETED, description: 'Fired when the execution of user input completes' });
eventRegistry.register({ name: EventTypes.COMMAND_EXECUTED, description: 'Fired when a command executes successfully' });
eventRegistry.register({ name: EventTypes.COMMAND_FAILED, description: 'Fired when a command execution fails' });
eventRegistry.register({ name: EventTypes.MEMORY_READ, description: 'Fired when a memory key is read' });
eventRegistry.register({ name: EventTypes.MEMORY_UPDATED, description: 'Fired when a memory key is updated' });
eventRegistry.register({ name: EventTypes.MEMORY_DELETED, description: 'Fired when a memory key is deleted' });
eventRegistry.register({ name: EventTypes.MEMORY_FAILED, description: 'Fired when a memory operation fails' });
