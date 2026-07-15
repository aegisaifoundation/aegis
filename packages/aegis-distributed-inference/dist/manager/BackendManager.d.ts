import { IAIBackend } from '../model/IAIBackend.js';
export declare class BackendManager {
    private backends;
    constructor();
    registerBackend(backend: IAIBackend): void;
    getBackend(backendId: string): IAIBackend | undefined;
    listBackends(): IAIBackend[];
    unloadBackend(backendId: string): void;
    /**
     * Automatically select the best backend based on model capabilities and system state.
     */
    selectOptimalBackend(modelId: string, allowedLocations: ('LOCAL' | 'REMOTE' | 'DISTRIBUTED')[]): string;
}
