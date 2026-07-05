export declare class WorkspaceManager {
    private workspacePath;
    constructor();
    private getRepositoryRoot;
    private getAegisCoreRoot;
    initialize(): void;
    getWorkspacePath(): string;
}
export declare const workspaceManager: WorkspaceManager;
