import type { Command } from '../types/Command.js';
export declare class CommandLoader {
    private getAegisCoreRoot;
    getWorkspaceRoot(): string;
    getCommandsDir(): string;
    private getRegistryCachePath;
    discoverCommands(): Promise<string[]>;
    loadCommand(commandPath: string): Promise<Command>;
}
