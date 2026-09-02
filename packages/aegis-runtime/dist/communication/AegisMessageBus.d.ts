import { IAegisMessageEnvelope } from '@aegis/sdk';
export type EngineMessageHandler = (envelope: IAegisMessageEnvelope) => void | Promise<void>;
export type MessageTypeCallback = (payload: any, senderNodeId: string, envelope: IAegisMessageEnvelope) => void | Promise<void>;
export declare class AegisMessageBus {
    private engineHandlers;
    private messageTypeListeners;
    registerEngine(engineId: string, handler: EngineMessageHandler): void;
    unregisterEngine(engineId: string): void;
    hasEngine(engineId: string): boolean;
    onMessage(messageType: string, callback: MessageTypeCallback): void;
    offMessage(messageType: string, callback: MessageTypeCallback): void;
    dispatch(envelope: IAegisMessageEnvelope): Promise<void>;
}
