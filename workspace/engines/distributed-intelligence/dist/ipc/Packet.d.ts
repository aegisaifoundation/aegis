import { MessageType } from './MessageTypes.js';
export interface Packet {
    protocolVersion: string;
    messageType: MessageType;
    messageId: string;
    timestamp: string;
    payload: Record<string, any>;
}
//# sourceMappingURL=Packet.d.ts.map