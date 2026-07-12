import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { Packet } from './Packet.js';
import { MessageType } from './MessageTypes.js';
export interface IPCTransport extends EventEmitter {
    send(packet: Packet): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
export declare class StdioTransport extends EventEmitter implements IPCTransport {
    private childProcess;
    private stdoutBuffer;
    private stderrBuffer;
    constructor();
    setProcess(cp: ChildProcess): void;
    send(packet: Packet): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
export declare class IPCManager extends EventEmitter {
    private transport;
    private pendingRequests;
    constructor();
    setTransport(transport: IPCTransport): void;
    getTransport(): IPCTransport | null;
    send(type: MessageType, payload?: Record<string, any>): Promise<void>;
    request(type: MessageType, payload?: Record<string, any>, timeoutMs?: number): Promise<any>;
    private handlePacket;
    shutdown(): Promise<void>;
}
export default IPCManager;
//# sourceMappingURL=IPCManager.d.ts.map