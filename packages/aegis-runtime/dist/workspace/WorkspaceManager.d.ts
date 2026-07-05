export declare class WorkspaceManager {
    private workspacePath;
    constructor();
    private getAegisCoreRoot;
    initialize(): void;
    getWorkspacePath(): string;
}
export declare const workspaceManager: WorkspaceManager;
