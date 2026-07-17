export type ExecutionLocation = 'LOCAL' | 'REMOTE' | 'DISTRIBUTED';

export type PolicyMode =
  | 'always-local'
  | 'prefer-local'
  | 'allow-remote'
  | 'require-remote'
  | 'allow-distributed'
  | 'never-distributed'
  | 'medical'
  | 'research'
  | 'offline';

export class ExecutionPolicyEngine {
  private activePolicies = new Set<PolicyMode>(['prefer-local']);

  setPolicy(policy: PolicyMode, active: boolean): void {
    if (active) {
      this.activePolicies.add(policy);
    } else {
      this.activePolicies.delete(policy);
    }
    console.log(`[ExecutionPolicyEngine] Updated policies: ${Array.from(this.activePolicies).join(', ')}`);
  }

  getActivePolicies(): PolicyMode[] {
    return Array.from(this.activePolicies);
  }

  /**
   * Determine allowed locations for execution based on active policies and prompt characteristics.
   */
  evaluateAllowedLocations(prompt: string, metadata?: any): ExecutionLocation[] {
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

    const locations: ExecutionLocation[] = ['LOCAL'];

    if (this.activePolicies.has('allow-remote')) {
      locations.push('REMOTE');
    }

    if (this.activePolicies.has('allow-distributed') && !this.activePolicies.has('never-distributed')) {
      locations.push('DISTRIBUTED');
    }

    return locations;
  }
}
