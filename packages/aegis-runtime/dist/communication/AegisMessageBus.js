import { CommunicationError, CommunicationErrorCode } from '@aegis/sdk';
export class AegisMessageBus {
    engineHandlers = new Map();
    messageTypeListeners = new Map();
    registerEngine(engineId, handler) {
        if (this.engineHandlers.has(engineId)) {
            console.warn(`[AegisMessageBus] Overwriting handler for registered engine "${engineId}".`);
        }
        this.engineHandlers.set(engineId, handler);
        console.log(`[AegisMessageBus] Engine registered on local bus: "${engineId}"`);
    }
    unregisterEngine(engineId) {
        this.engineHandlers.delete(engineId);
    }
    hasEngine(engineId) {
        return this.engineHandlers.has(engineId);
    }
    onMessage(messageType, callback) {
        if (!this.messageTypeListeners.has(messageType)) {
            this.messageTypeListeners.set(messageType, new Set());
        }
        this.messageTypeListeners.get(messageType).add(callback);
    }
    offMessage(messageType, callback) {
        const callbacks = this.messageTypeListeners.get(messageType);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
    async dispatch(envelope) {
        const targetEngine = envelope.targetEngine;
        // 1. If targeted at a specific engine, route to that engine handler
        if (targetEngine) {
            const handler = this.engineHandlers.get(targetEngine);
            if (!handler) {
                throw new CommunicationError(CommunicationErrorCode.ENGINE_NOT_FOUND, `No registered engine handler found for targetEngine "${targetEngine}".`);
            }
            try {
                await Promise.resolve(handler(envelope));
            }
            catch (err) {
                console.error(`[AegisMessageBus] Exception in engine handler "${targetEngine}":`, err);
                throw new CommunicationError(CommunicationErrorCode.ENGINE_HANDLER_FAILED, `Engine handler "${targetEngine}" failed processing message ${envelope.messageId}: ${err.message}`, { originalError: err.message });
            }
        }
        // 2. Also dispatch to type-specific callbacks if registered
        const callbacks = this.messageTypeListeners.get(envelope.messageType);
        if (callbacks) {
            for (const cb of callbacks) {
                try {
                    await Promise.resolve(cb(envelope.payload, envelope.senderNodeId, envelope));
                }
                catch (err) {
                    console.error(`[AegisMessageBus] Exception in messageType callback for "${envelope.messageType}":`, err);
                }
            }
        }
    }
}
