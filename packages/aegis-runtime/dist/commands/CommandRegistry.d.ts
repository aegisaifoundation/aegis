import type { Command } from '../types/Command.js';
import { CommandState } from '../types/Command.js';
export declare class CommandRegistry {
    private commands;
    private states;
    register(command: Command): void;
    unregister(name: string): boolean;
    get(name: string): Command | undefined;
    has(name: string): boolean;
    list(): Command[];
    getState(name: string): CommandState | undefined;
    setState(name: string, state: CommandState): void;
}
export declare const commandRegistry: CommandRegistry;
