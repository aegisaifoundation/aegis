import type { LoRAAdapter } from '../types/index.js';
import type { LoRAManager } from '../model/LoRAManager.js';
export declare class ValidationManager {
    private loraManager;
    private seenHashesInRounds;
    constructor(loraManager: LoRAManager);
    /**
     * Validate an incoming LoRA adapter.
     *
     * @param adapter The LoRAAdapter description record
     * @param roundConfig Config parameters of the current round to match against
     * @param diTrustService DI TrustService reference
     */
    validateLoRA(adapter: LoRAAdapter, roundConfig?: {
        roundId: string;
        rank?: number;
        alpha?: number;
        baseModelId?: string;
    }, diTrustService?: any): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    clearRoundCache(roundId: string): void;
}
//# sourceMappingURL=ValidationManager.d.ts.map