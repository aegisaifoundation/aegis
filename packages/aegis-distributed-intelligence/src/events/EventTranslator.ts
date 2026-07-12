import { Packet } from '../ipc/Packet.js';

export class EventTranslator {
  static translate(packet: Packet): { eventName: string; payload: Record<string, any> } | null {
    const nativeEvent = packet.payload.eventName || packet.payload.event;
    if (!nativeEvent) return null;

    const sourcePayload = packet.payload.data || packet.payload;
    let eventName = `distributed.${nativeEvent.toLowerCase().replace(/_/g, '.')}`;
    
    // Check specific translations
    if (nativeEvent === 'NODE_JOINED') {
      eventName = 'distributed.node.joined';
    } else if (nativeEvent === 'NODE_LEFT') {
      eventName = 'distributed.node.left';
    } else if (nativeEvent === 'CONSENSUS_REACHED') {
      eventName = 'distributed.consensus.reached';
    }

    return {
      eventName,
      payload: {
        timestamp: packet.timestamp,
        messageId: packet.messageId,
        ...sourcePayload
      }
    };
  }
}
export default EventTranslator;
