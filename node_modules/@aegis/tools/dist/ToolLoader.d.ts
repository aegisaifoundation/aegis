import type { Tool } from '@aegis/runtime';
export declare class ToolLoader {
    private getAegisCoreRoot;
    private getWorkspaceRoot;
    getToolsDir(): string;
    loadTool(toolPath: string): Promise<Tool>;
}
