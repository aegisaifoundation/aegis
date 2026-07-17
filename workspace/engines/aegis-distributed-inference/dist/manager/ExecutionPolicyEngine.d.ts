export type ExecutionLocation = 'LOCAL' | 'REMOTE' | 'DISTRIBUTED';
export type PolicyMode = 'always-local' | 'prefer-local' | 'allow-remote' | 'require-remote' | 'allow-distributed' | 'never-distributed' | 'medical' | 'research' | 'offline';
export declare class ExecutionPolicyEngine {
    private activePolicies;
    setPolicy(policy: PolicyMode, active: boolean): void;
    getActivePolicies(): PolicyMode[];
    /**
     * Determine allowed locations for execution based on active policies and prompt characteristics.
     */
    evaluateAllowedLocations(prompt: string, metadata?: any): ExecutionLocation[];
}
