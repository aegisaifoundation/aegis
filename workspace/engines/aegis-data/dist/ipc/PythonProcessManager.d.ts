import { EventEmitter } from 'events';
export declare class PythonProcessManager extends EventEmitter {
    private pythonPath?;
    private childProcess;
    private stdoutBuffer;
    private stderrBuffer;
    private pendingRequests;
    private isReady;
    private readyResolver;
    private readyPromise;
    constructor(pythonPath?: string | undefined);
    start(): Promise<void>;
    request(action: string, data: any, extraPayload?: Record<string, any>, timeoutMs?: number): Promise<any>;
    stop(): void;
    private rejectAllPending;
    private detectPython;
}
