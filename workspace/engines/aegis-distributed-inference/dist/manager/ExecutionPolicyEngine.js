export class ExecutionPolicyEngine {
    activePolicies = new Set(['prefer-local']);
    setPolicy(policy, active) {
        if (active) {
            this.activePolicies.add(policy);
        }
        else {
            this.activePolicies.delete(policy);
        }
        console.log(`[ExecutionPolicyEngine] Updated policies: ${Array.from(this.activePolicies).join(', ')}`);
    }
    getActivePolicies() {
        return Array.from(this.activePolicies);
    }
    /**
     * Determine allowed locations for execution based on active policies and prompt characteristics.
     */
    evaluateAllowedLocations(prompt, metadata) {
        // Medical Mode: strictly blocks REMOTE/cloud and only permits LOCAL or DISTRIBUTED reasoning on approved nodes.
        if (this.activePolicies.has('medical')) {
            if (this.activePolicies.has('offline')) {
                return ['LOCAL'];
            }
            return ['LOCAL', 'DISTRIBUTED'];
        }
        // Offline Mode: strictly blocks all network egress, remote APIs, and distributed hops.
        if (this.activePolicies.has('offline') || this.activePolicies.has('always-local')) {
            return ['LOCAL'];
        }
        if (this.activePolicies.has('require-remote')) {
            return ['REMOTE'];
        }
        const locations = ['LOCAL'];
        if (this.activePolicies.has('allow-remote')) {
            locations.push('REMOTE');
        }
        if (this.activePolicies.has('allow-distributed') && !this.activePolicies.has('never-distributed')) {
            locations.push('DISTRIBUTED');
        }
        return locations;
    }
}
//# sourceMappingURL=ExecutionPolicyEngine.js.map