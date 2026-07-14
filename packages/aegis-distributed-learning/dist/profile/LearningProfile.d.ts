import type { ILearningProfile, LearningDomain, LoRAConfig, DataCategory } from '../types/index.js';
/**
 * LearningProfile
 *
 * A profile defines WHAT is being learned — the domain, base model,
 * LoRA configuration, and data constraints.
 *
 * The ILearningStrategy defines HOW the learning is coordinated.
 * These two dimensions are fully independent.
 *
 * Example profiles:
 *   - "Medical LoRA" → domain: 'medical', strict data constraints
 *   - "Coding assistant" → domain: 'code', relaxed constraints
 *   - "Vision model" → domain: 'vision', large rank LoRA config
 */
export declare class LearningProfile implements ILearningProfile {
    readonly profileId: string;
    readonly name: string;
    readonly baseModelId: string;
    readonly domain: LearningDomain;
    readonly loraConfig: LoRAConfig;
    readonly dataConstraints: DataCategory[];
    readonly defaultStrategy: string;
    readonly createdAt: Date;
    readonly metadata: Record<string, any>;
    constructor(params: Omit<ILearningProfile, 'profileId' | 'createdAt'> & {
        profileId?: string;
    });
}
/**
 * LearningProfileRegistry
 *
 * CRUD registry for learning profiles, persisted to disk.
 * Each profile is stored as a JSON file under <workspace>/learning/profiles/.
 */
export declare class LearningProfileRegistry {
    private profiles;
    private profilesDir;
    constructor(workspacePath: string);
    /**
     * Register a new learning profile.
     * Throws if a profile with the same ID already exists.
     */
    registerProfile(profile: ILearningProfile): void;
    getProfile(profileId: string): ILearningProfile | undefined;
    /** Find profiles by domain */
    getProfilesByDomain(domain: LearningDomain): ILearningProfile[];
    listProfiles(): ILearningProfile[];
    /** Update a profile's metadata (non-structural fields only) */
    updateProfile(profileId: string, updates: Partial<Pick<ILearningProfile, 'metadata'>>): void;
    deleteProfile(profileId: string): void;
    getProfileCount(): number;
    private _persist;
    private _loadExisting;
    private _ensureDir;
}
//# sourceMappingURL=LearningProfile.d.ts.map