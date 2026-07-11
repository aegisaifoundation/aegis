import type { Command } from '../types/Command.js';
import { CommandState } from '../types/Command.js';
import { eventBus } from '../eventbus/EventBus.js';

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private states: Map<string, CommandState> = new Map();

  register(command: Command) {
    const key = command.name.toLowerCase();
    this.commands.set(key, command);
    this.states.set(key, CommandState.REGISTERED);
    eventBus.emit('command_registered', { name: command.name, path: command.commandPath });
  }

  unregister(name: string): boolean {
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

  get(name: string): Command | undefined {
    return this.commands.get(name.toLowerCase());
  }

  has(name: string): boolean {
    return this.commands.has(name.toLowerCase());
  }

  list(): Command[] {
    return Array.from(this.commands.values());
  }

  getState(name: string): CommandState | undefined {
    return this.states.get(name.toLowerCase());
  }

  setState(name: string, state: CommandState) {
    this.states.set(name.toLowerCase(), state);
  }
}

export const commandRegistry = new CommandRegistry();
