import { CollaborationPolicy, CollaborationPolicyType } from '../types/index.js';
export declare class PolicyManager {
    private activePolicy;
    constructor(policyType?: CollaborationPolicyType);
    setPolicy(policyType: CollaborationPolicyType): void;
    getPolicy(): CollaborationPolicy;
    /**
     * Verify compatibility before joining a session.
     * Checks trust thresholds and node blacklists.
     */
    canCollaborateWith(nodeId: string, peerTrustScore: number): boolean;
    /**
     * Enforces restrictions on sharing artifacts.
     */
    canShareCategory(category: string): boolean;
    private _buildPolicyForType;
}
