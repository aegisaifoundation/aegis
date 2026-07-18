export interface SessionContext {
    correlationId: string;
    sessionId: string;
    nodeId?: string;
    userId?: string;
}
export interface SyscallMessage {
    category: string;
    method: string;
    params: any;
    context: SessionContext;
    authHeader?: string;
}
export interface SyscallResponse<T = any> {
    success: boolean;
    result?: T;
    error?: {
        code: string;
        message: string;
        stack?: string;
    };
}
export interface ITransportClient {
    connect(options: {
        endpoint: string;
        apiKey?: string;
        token?: string;
    }): Promise<void>;
    disconnect(): Promise<void>;
    send(message: SyscallMessage): Promise<SyscallResponse>;
    subscribe(event: string, callback: (payload: any) => void): Promise<string>;
    unsubscribe(subscriptionId: string): Promise<void>;
}
export interface ITransportServer {
    start(): Promise<void>;
    stop(): Promise<void>;
    registerHandler(handler: (msg: SyscallMessage) => Promise<SyscallResponse>): void;
}
