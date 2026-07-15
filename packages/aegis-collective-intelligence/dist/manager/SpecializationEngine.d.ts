import type { ExpertiseManager } from './ExpertiseManager.js';
export declare class SpecializationEngine {
    private expertiseManager;
    constructor(expertiseManager: ExpertiseManager);
    getSpecializationRole(): string;
}
