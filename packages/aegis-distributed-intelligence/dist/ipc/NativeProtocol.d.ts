import { MessageType } from './MessageTypes.js';
import { Packet } from './Packet.js';
export declare class NativeProtocol {
    private static PROTOCOL_VERSION;
    static serialize(packet: Packet): string;
    static createPacket(type: MessageType, payload?: Record<string, any>): Packet;
    static parse(line: string): Packet | null;
}
//# sourceMappingURL=NativeProtocol.d.ts.map