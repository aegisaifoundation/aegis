export declare class IpcServer {
    private workspacePath;
    private server;
    constructor(workspacePath: string);
    start(): void;
    stop(): void;
}
