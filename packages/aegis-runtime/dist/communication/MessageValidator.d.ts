import { IAegisMessageEnvelope } from '@aegis/sdk';
export declare class MessageValidator {
    static validateNodeId(nodeId: string, label?: string): void;
    static validateEnvelope(envelope: any): IAegisMessageEnvelope;
}
