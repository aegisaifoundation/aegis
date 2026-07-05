import { Tool, ToolState } from './Tool.js';
export declare class ToolRegistry {
    private tools;
    private states;
    register(tool: Tool): void;
    unregister(name: string): boolean;
    getTool(name: string): Tool | undefined;
    getAllTools(): Tool[];
    hasTool(name: string): boolean;
    setToolState(name: string, state: ToolState): void;
    getToolState(name: string): ToolState | undefined;
}
export declare const toolRegistry: ToolRegistry;
