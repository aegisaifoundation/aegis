import { randomUUID } from 'crypto';
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
export class PrivacyManager {
    /** Categories that can NEVER be transmitted regardless of configuration */
    static HARD_BLOCKED = [
        'dataset',
        'private_document',
        'conversation_history',
        'memory',
        'raw_user_file'
    ];
    /** Categories that require explicit 'shareable' tag to transmit */
    static CONDITIONALLY_BLOCKED = [
        'knowledge_package'
    ];
    auditLog = [];
    /**
     * Determine whether a given data type may be transmitted.
     *
     * @param dataType  Category of the data being considered for transmission
     * @param tags      Optional tags on the data (e.g. ['shareable'])
     * @returns 'ALLOWED' | 'DENIED'
     */
    canTransmit(dataType, tags = []) {
        if (PrivacyManager.HARD_BLOCKED.includes(dataType)) {
            return 'DENIED';
        }
        if (PrivacyManager.CONDITIONALLY_BLOCKED.includes(dataType)) {
            return tags.includes('shareable') ? 'ALLOWED' : 'DENIED';
        }
        return 'ALLOWED';
    }
    /**
     * Sanitise an outbound payload by removing any fields whose data category
     * is denied for transmission.
     *
     * @param payload     Raw payload object about to be sent
     * @param fieldTypes  Map of field name → DataCategory for classification
     */
    sanitizePayload(payload, fieldTypes = {}) {
        const sanitized = {};
        for (const [key, value] of Object.entries(payload)) {
            const category = fieldTypes[key];
            if (category && this.canTransmit(category) === 'DENIED') {
                console.warn(`[PrivacyManager] Stripped field '${key}' (${category}) from outbound payload.`);
                continue;
            }
            sanitized[key] = value;
        }
        return sanitized;
    }
    /**
     * Record a transmission attempt in the privacy audit log.
     * Called by strategies before any outbound DI messaging call.
     */
    auditTransmission(dataType, targetNodeId, tags = []) {
        const clearance = this.canTransmit(dataType, tags);
        const event = {
            eventId: randomUUID(),
            dataType,
            targetNodeId,
            clearance,
            timestamp: new Date(),
            reason: clearance === 'DENIED'
                ? `${dataType} is blocked by privacy policy`
                : 'transmission approved'
        };
        this.auditLog.push(event);
        if (clearance === 'DENIED') {
            console.warn(`[PrivacyManager] BLOCKED transmission of '${dataType}' to ${targetNodeId}.`);
        }
        return clearance;
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    clearAuditLog() {
        this.auditLog = [];
    }
    isBlocked(dataType) {
        return this.canTransmit(dataType) === 'DENIED';
    }
}
//# sourceMappingURL=PrivacyManager.js.map