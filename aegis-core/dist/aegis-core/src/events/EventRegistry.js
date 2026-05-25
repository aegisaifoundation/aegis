import { EventTypes } from './EventTypes.js';
export class EventRegistry {
    registeredEvents = new Map();
    register(metadata) {
        this.registeredEvents.set(metadata.name, metadata);
    }
    get(name) {
        return this.registeredEvents.get(name);
    }
    has(name) {
        return this.registeredEvents.has(name);
    }
    list() {
        return Array.from(this.registeredEvents.values());
    }
    validate(name, payload) {
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
