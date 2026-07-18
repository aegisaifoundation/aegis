import { EventEmitter } from 'events';
export declare class PythonIpcBridge extends EventEmitter {
    private pythonPath;
    private childProcess;
    private stdoutBuffer;
    private stderrBuffer;
    private pendingRequests;
    private isReady;
    private readyResolver;
    private readyPromise;
    constructor(pythonPath?: string);
    start(): Promise<void>;
    request(action: string, data: any, timeoutMs?: number): Promise<any>;
    stop(): void;
    private rejectAllPending;
}
export declare const pythonIpcBridge: PythonIpcBridge;
export default pythonIpcBridge;
