import { ITransportAdapter } from './ITransportAdapter.js';
export declare class NativeTcpTransportAdapter implements ITransportAdapter {
    private ipcManagerProvider;
    readonly transportType = "native_tcp";
    private connectionCallbacks;
    private messageCallbacks;
    private disconnectCallbacks;
    private errorCallbacks;
    constructor(ipcManagerProvider: () => any);
    listen(port: number, host?: string): Promise<number>;
    connect(host: string, port: number): Promise<any>;
    send(socket: any, payload: string): Promise<void>;
    disconnect(socket: any): Promise<void>;
    onConnection(callback: (socket: any, remoteAddr: string) => void): void;
    onMessage(callback: (socket: any, payload: string) => void): void;
    onDisconnect(callback: (socket: any) => void): void;
    onError(callback: (err: Error) => void): void;
    stop(): Promise<void>;
}
