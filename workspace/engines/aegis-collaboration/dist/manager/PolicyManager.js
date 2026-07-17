export class PolicyManager {
    activePolicy;
    constructor(policyType = 'personal') {
        this.activePolicy = this._buildPolicyForType(policyType);
    }
    setPolicy(policyType) {
        this.activePolicy = this._buildPolicyForType(policyType);
        console.log(`[PolicyManager] Active policy set to: ${policyType}`);
    }
    getPolicy() {
        return this.activePolicy;
    }
    /**
     * Verify compatibility before joining a session.
     * Checks trust thresholds and node blacklists.
     */
    canCollaborateWith(nodeId, peerTrustScore) {
        if (this.activePolicy.blockedNodes.includes(nodeId)) {
            console.warn(`[PolicyManager] Node ${nodeId} is blacklisted by policy`);
            return false;
        }
        if (peerTrustScore < this.activePolicy.requiredTrustScore) {
            console.warn(`[PolicyManager] Node ${nodeId} trust score ${peerTrustScore} is below required threshold ${this.activePolicy.requiredTrustScore}`);
            return false;
        }
        return true;
    }
    /**
     * Enforces restrictions on sharing artifacts.
     */
    canShareCategory(category) {
        // Hard blocked raw fields as per Phase 5 & 6 privacy specs
        const HARD_BLOCKED = ['dataset', 'private_document', 'conversation_history', 'memory', 'raw_user_file'];
        if (HARD_BLOCKED.includes(category)) {
            return false;
        }
        return this.activePolicy.allowedSharingCategories.includes(category);
    }
    _buildPolicyForType(type) {
        switch (type) {
            case 'medical':
                return {
                    policyType: 'medical',
                    allowedSharingCategories: ['knowledge_package', 'experience_package', 'reasoning_result'],
                    requiredTrustScore: 0.9,
                    blockedNodes: [],
                    enforceSignatures: true
                };
            case 'research':
                return {
                    policyType: 'research',
                    allowedSharingCategories: ['knowledge_package', 'experience_package', 'reasoning_result', 'tool_package'],
                    requiredTrustScore: 0.7,
                    blockedNodes: [],
                    enforceSignatures: true
                };
            case 'government':
                return {
                    policyType: 'government',
                    allowedSharingCategories: ['reasoning_result'],
                    requiredTrustScore: 0.95,
                    blockedNodes: [],
                    enforceSignatures: true
                };
            case 'enterprise':
                return {
                    policyType: 'enterprise',
                    allowedSharingCategories: ['knowledge_package', 'reasoning_result', 'workflow_package'],
                    requiredTrustScore: 0.8,
                    blockedNodes: [],
                    enforceSignatures: true
                };
            case 'personal':
            default:
                return {
                    policyType: 'personal',
                    allowedSharingCategories: ['experience_package', 'reasoning_result'],
                    requiredTrustScore: 0.5,
                    blockedNodes: [],
                    enforceSignatures: false
                };
        }
    }
}
