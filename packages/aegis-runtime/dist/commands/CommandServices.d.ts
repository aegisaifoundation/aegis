export interface CommandServices {
    getExecutor(): any;
    getRegistry(): any;
    getEventBus(): any;
    getWorkspacePath(): string;
    getConversationContext(): any;
    getModelProvider(): any;
    getToolRegistry(): any;
    getToolLoader(): any;
    getConfigurationManager(): any;
    getCommandLoader(): any;
    getConfig(): any;
    getPluginRegistry(): any;
    getSkillRegistry(): any;
    getCapabilityManager(): any;
    getLogger(): any;
}
export declare const commandServices: CommandServices;
export type { CommandRegistry } from './CommandRegistry.js';
export type { CommandContext } from '../types/Command.js';
export type { Command, CommandResult } from '../types/Command.js';
export type { CommandManifest } from './types/CommandManifest.js';
export type { CommandInvocation } from './types/CommandInvocation.js';
export { CommandState } from '../types/Command.js';
