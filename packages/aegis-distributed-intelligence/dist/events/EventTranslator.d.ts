import { Packet } from '../ipc/Packet.js';
export declare class EventTranslator {
    static translate(packet: Packet): {
        eventName: string;
        payload: Record<string, any>;
    } | null;
}
export default EventTranslator;
//# sourceMappingURL=EventTranslator.d.ts.map