import { ExpertiseProfile } from '../types/index.js';
export declare class ExpertiseManager {
    private profiles;
    constructor();
    getProfile(domain: string): ExpertiseProfile;
    recordTaskOutcome(domain: string, success: boolean): void;
    listProfiles(): ExpertiseProfile[];
}
