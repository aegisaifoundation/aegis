import { CommandState } from './types/Command.js';
import { eventBus } from '../runtime/EventBus.js';
export class CommandRegistry {
    commands = new Map();
    states = new Map();
    register(command) {
        const key = command.name.toLowerCase();
        this.commands.set(key, command);
        this.states.set(key, CommandState.REGISTERED);
        eventBus.emit('command_registered', { name: command.name, path: command.commandPath });
    }
    unregister(name) {
        const key = name.toLowerCase();
        if (this.commands.has(key)) {
            const command = this.commands.get(key);
            this.commands.delete(key);
            this.states.set(key, CommandState.DISABLED);
            eventBus.emit('command_disabled', { name });
            return true;
        }
        return false;
    }
    get(name) {
        return this.commands.get(name.toLowerCase());
    }
    has(name) {
        return this.commands.has(name.toLowerCase());
    }
    list() {
        return Array.from(this.commands.values());
    }
    getState(name) {
        return this.states.get(name.toLowerCase());
    }
    setState(name, state) {
        this.states.set(name.toLowerCase(), state);
    }
}
export const commandRegistry = new CommandRegistry();
