import type { CommandInvocation } from './types/CommandInvocation.js';
export declare class CommandRouter {
    handleInvocation(invocation: CommandInvocation): Promise<string | null>;
    handleCommand(input: string): Promise<string | null>;
}
export declare const commandRouter: CommandRouter;
