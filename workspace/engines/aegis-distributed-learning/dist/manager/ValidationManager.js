export class ValidationManager {
    loraManager;
    seenHashesInRounds = new Map();
    constructor(loraManager) {
        this.loraManager = loraManager;
    }
    /**
     * Validate an incoming LoRA adapter.
     *
     * @param adapter The LoRAAdapter description record
     * @param roundConfig Config parameters of the current round to match against
     * @param diTrustService DI TrustService reference
     */
    async validateLoRA(adapter, roundConfig, diTrustService) {
        // 1. Signature Verification
        if (!this.loraManager.verifyAdapter(adapter.id)) {
            return { valid: false, reason: 'signature_verification_failed' };
        }
        // 2. Version Verification
        if (!adapter.version || !adapter.version.startsWith('v')) {
            return { valid: false, reason: 'version_verification_failed' };
        }
        // 3. Compatibility Verification
        if (roundConfig) {
            if (roundConfig.rank !== undefined && adapter.rank !== roundConfig.rank) {
                return { valid: false, reason: 'compatibility_rank_mismatch' };
            }
            if (roundConfig.alpha !== undefined && adapter.alpha !== roundConfig.alpha) {
                return { valid: false, reason: 'compatibility_alpha_mismatch' };
            }
            if (roundConfig.baseModelId !== undefined && adapter.modelId !== roundConfig.baseModelId) {
                return { valid: false, reason: 'compatibility_model_mismatch' };
            }
        }
        // 4. Duplicate Detection
        if (roundConfig?.roundId) {
            let roundHashes = this.seenHashesInRounds.get(roundConfig.roundId);
            if (!roundHashes) {
                roundHashes = new Set();
                this.seenHashesInRounds.set(roundConfig.roundId, roundHashes);
            }
            if (roundHashes.has(adapter.hash)) {
                return { valid: false, reason: 'duplicate_update_detected' };
            }
            roundHashes.add(adapter.hash);
        }
        // 5. Integrity Validation
        if (!adapter.hash || adapter.sizeBytes <= 0) {
            return { valid: false, reason: 'integrity_check_failed' };
        }
        // 6. Trust Validation
        if (diTrustService && adapter.metadata?.nodeId) {
            const trusted = await diTrustService.verifyPeerTrust(adapter.metadata.nodeId);
            if (!trusted) {
                return { valid: false, reason: 'trust_validation_failed' };
            }
        }
        return { valid: true };
    }
    clearRoundCache(roundId) {
        this.seenHashesInRounds.delete(roundId);
    }
}
//# sourceMappingURL=ValidationManager.js.map