import { MessageType } from './MessageTypes.js';
import { Packet } from './Packet.js';
import crypto from 'crypto';

export class NativeProtocol {
  private static PROTOCOL_VERSION = '1.0.0';

  static serialize(packet: Packet): string {
    return JSON.stringify(packet) + '\n';
  }

  static createPacket(type: MessageType, payload: Record<string, any> = {}): Packet {
    return {
      protocolVersion: this.PROTOCOL_VERSION,
      messageType: type,
      messageId: `msg-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      payload
    };
  }

  static parse(line: string): Packet | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // 1. Check for legacy keyword signals
    if (trimmed === 'AEGIS_DIE_READY') {
      return this.createPacket(MessageType.READY, { message: 'Engine reported ready' });
    }
    if (trimmed === 'AEGIS_DIE_STOPPED') {
      return this.createPacket(MessageType.SHUTDOWN, { message: 'Engine reported stopped' });
    }

    // 2. Attempt JSON parsing
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.messageType && parsed.protocolVersion) {
          return parsed as Packet;
        }
        // Generic JSON payload: wrap it in an EVENT packet
        return this.createPacket(MessageType.EVENT, parsed);
      } catch (e) {
        // SyntaxError on JSON, proceed to treat as legacy log line
      }
    }

    // 3. Plaintext fallback: Parse log severity
    const lower = trimmed.toLowerCase();
    let type = MessageType.LOG;
    let level = 'INFO';

    if (lower.includes('error') || lower.includes('failed') || lower.includes('stderr')) {
      type = MessageType.ERROR;
      level = 'ERROR';
    } else if (lower.includes('warning') || lower.includes('warn')) {
      type = MessageType.WARNING;
      level = 'WARN';
    }

    return this.createPacket(type, {
      message: trimmed,
      level,
      source: 'stdout'
    });
  }
}
