export declare class WorkspaceManager {
    private workspacePath;
    constructor();
    private getRepositoryRoot;
    private getConfigPath;
    initialize(): void;
    getWorkspacePath(): string;
}
export declare const workspaceManager: WorkspaceManager;
