import { ITransportAdapter } from './ITransportAdapter.js';
export declare const MAX_TCP_FRAME_SIZE: number;
export declare class NodeTcpTransportAdapter implements ITransportAdapter {
    readonly transportType = "tcp";
    private server;
    private activeSockets;
    private connectionCallbacks;
    private messageCallbacks;
    private disconnectCallbacks;
    private errorCallbacks;
    listen(port: number, host?: string, strictPort?: boolean): Promise<number>;
    connect(host: string, port: number): Promise<any>;
    send(socket: any, payload: string): Promise<void>;
    disconnect(socket: any): Promise<void>;
    onConnection(callback: (socket: any, remoteAddr: string) => void): void;
    onMessage(callback: (socket: any, payload: string) => void): void;
    onDisconnect(callback: (socket: any) => void): void;
    onError(callback: (err: Error) => void): void;
    stop(): Promise<void>;
}
