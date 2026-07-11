import { Transport } from './Transport.js';
export declare class TerminalTransport implements Transport {
    initialize(): Promise<void>;
    private startReadlineLoop;
    sendInput(input: string): Promise<void>;
    sendInterrupt(): void;
}
export declare const terminalTransport: TerminalTransport;
