export interface IpcRequest {
    version: string;
    requestId: string;
    command: string;
    payload: any;
}
export interface IpcResponse {
    version: string;
    requestId: string;
    command: string;
    result?: any;
    error?: string;
}
export declare const CURRENT_IPC_VERSION = "1.0.0";
