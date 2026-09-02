import {
  IAegisMessageEnvelope,
  CommunicationError,
  CommunicationErrorCode
} from '@aegis/sdk';

export type EngineMessageHandler = (envelope: IAegisMessageEnvelope) => void | Promise<void>;
export type MessageTypeCallback = (payload: any, senderNodeId: string, envelope: IAegisMessageEnvelope) => void | Promise<void>;

export class AegisMessageBus {
  private engineHandlers = new Map<string, EngineMessageHandler>();
  private messageTypeListeners = new Map<string, Set<MessageTypeCallback>>();

  registerEngine(engineId: string, handler: EngineMessageHandler): void {
    if (this.engineHandlers.has(engineId)) {
      console.warn(`[AegisMessageBus] Overwriting handler for registered engine "${engineId}".`);
    }
    this.engineHandlers.set(engineId, handler);
    console.log(`[AegisMessageBus] Engine registered on local bus: "${engineId}"`);
  }

  unregisterEngine(engineId: string): void {
    this.engineHandlers.delete(engineId);
  }

  hasEngine(engineId: string): boolean {
    return this.engineHandlers.has(engineId);
  }

  onMessage(messageType: string, callback: MessageTypeCallback): void {
    if (!this.messageTypeListeners.has(messageType)) {
      this.messageTypeListeners.set(messageType, new Set());
    }
    this.messageTypeListeners.get(messageType)!.add(callback);
  }

  offMessage(messageType: string, callback: MessageTypeCallback): void {
    const callbacks = this.messageTypeListeners.get(messageType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  async dispatch(envelope: IAegisMessageEnvelope): Promise<void> {
    const targetEngine = envelope.targetEngine;

    // 1. If targeted at a specific engine, route to that engine handler
    if (targetEngine) {
      const handler = this.engineHandlers.get(targetEngine);
      if (!handler) {
        throw new CommunicationError(
          CommunicationErrorCode.ENGINE_NOT_FOUND,
          `No registered engine handler found for targetEngine "${targetEngine}".`
        );
      }

      try {
        await Promise.resolve(handler(envelope));
      } catch (err: any) {
        console.error(`[AegisMessageBus] Exception in engine handler "${targetEngine}":`, err);
        throw new CommunicationError(
          CommunicationErrorCode.ENGINE_HANDLER_FAILED,
          `Engine handler "${targetEngine}" failed processing message ${envelope.messageId}: ${err.message}`,
          { originalError: err.message }
        );
      }
    }

    // 2. Also dispatch to type-specific callbacks if registered
    const callbacks = this.messageTypeListeners.get(envelope.messageType);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          await Promise.resolve(cb(envelope.payload, envelope.senderNodeId, envelope));
        } catch (err: any) {
          console.error(`[AegisMessageBus] Exception in messageType callback for "${envelope.messageType}":`, err);
        }
      }
    }
  }
}
