import type { DataCategory, TransmissionClearance } from '../types/index.js';
/** Represents a privacy audit event */
interface PrivacyAuditEvent {
    readonly eventId: string;
    readonly dataType: DataCategory;
    readonly targetNodeId: string;
    readonly clearance: TransmissionClearance;
    readonly timestamp: Date;
    readonly reason: string;
}
/**
 * PrivacyManager
 *
 * Enforces what data categories may leave this AEGIS node.
 *
 * Hard-blocked (never transmit):
 *   - dataset
 *   - private_document
 *   - conversation_history
 *   - memory
 *   - raw_user_file
 *
 * Conditionally permitted (requires explicit clearance flag):
 *   - knowledge_package
 *
 * Always permitted:
 *   - lora_adapter
 *   - model_update
 *   - metadata
 */
export declare class PrivacyManager {
    /** Categories that can NEVER be transmitted regardless of configuration */
    static readonly HARD_BLOCKED: DataCategory[];
    /** Categories that require explicit 'shareable' tag to transmit */
    static readonly CONDITIONALLY_BLOCKED: DataCategory[];
    private auditLog;
    /**
     * Determine whether a given data type may be transmitted.
     *
     * @param dataType  Category of the data being considered for transmission
     * @param tags      Optional tags on the data (e.g. ['shareable'])
     * @returns 'ALLOWED' | 'DENIED'
     */
    canTransmit(dataType: DataCategory, tags?: string[]): TransmissionClearance;
    /**
     * Sanitise an outbound payload by removing any fields whose data category
     * is denied for transmission.
     *
     * @param payload     Raw payload object about to be sent
     * @param fieldTypes  Map of field name → DataCategory for classification
     */
    sanitizePayload(payload: Record<string, any>, fieldTypes?: Partial<Record<string, DataCategory>>): Record<string, any>;
    /**
     * Record a transmission attempt in the privacy audit log.
     * Called by strategies before any outbound DI messaging call.
     */
    auditTransmission(dataType: DataCategory, targetNodeId: string, tags?: string[]): TransmissionClearance;
    getAuditLog(): PrivacyAuditEvent[];
    clearAuditLog(): void;
    isBlocked(dataType: DataCategory): boolean;
}
export {};
//# sourceMappingURL=PrivacyManager.d.ts.map