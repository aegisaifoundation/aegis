import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
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
export class LearningProfile {
    profileId;
    name;
    baseModelId;
    domain;
    loraConfig;
    dataConstraints;
    defaultStrategy;
    createdAt;
    metadata;
    constructor(params) {
        this.profileId = params.profileId ?? randomUUID();
        this.name = params.name;
        this.baseModelId = params.baseModelId;
        this.domain = params.domain;
        this.loraConfig = params.loraConfig;
        this.dataConstraints = params.dataConstraints;
        this.defaultStrategy = params.defaultStrategy;
        this.createdAt = new Date();
        this.metadata = params.metadata ?? {};
    }
}
/**
 * LearningProfileRegistry
 *
 * CRUD registry for learning profiles, persisted to disk.
 * Each profile is stored as a JSON file under <workspace>/learning/profiles/.
 */
export class LearningProfileRegistry {
    profiles = new Map();
    profilesDir;
    constructor(workspacePath) {
        this.profilesDir = path.join(workspacePath, 'learning', 'profiles');
        this._ensureDir(this.profilesDir);
        this._loadExisting();
    }
    /**
     * Register a new learning profile.
     * Throws if a profile with the same ID already exists.
     */
    registerProfile(profile) {
        if (this.profiles.has(profile.profileId)) {
            throw new Error(`[ProfileRegistry] Profile ${profile.profileId} already exists.`);
        }
        this.profiles.set(profile.profileId, profile);
        this._persist(profile);
        console.log(`[ProfileRegistry] Registered profile '${profile.name}' (${profile.profileId})`);
    }
    getProfile(profileId) {
        return this.profiles.get(profileId);
    }
    /** Find profiles by domain */
    getProfilesByDomain(domain) {
        return Array.from(this.profiles.values()).filter(p => p.domain === domain);
    }
    listProfiles() {
        return Array.from(this.profiles.values());
    }
    /** Update a profile's metadata (non-structural fields only) */
    updateProfile(profileId, updates) {
        const profile = this.profiles.get(profileId);
        if (!profile)
            throw new Error(`[ProfileRegistry] Profile ${profileId} not found.`);
        const updated = { ...profile, metadata: { ...profile.metadata, ...updates.metadata } };
        this.profiles.set(profileId, updated);
        this._persist(updated);
    }
    deleteProfile(profileId) {
        const profile = this.profiles.get(profileId);
        if (!profile)
            return;
        this.profiles.delete(profileId);
        const filePath = path.join(this.profilesDir, `${profileId}.json`);
        if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
        console.log(`[ProfileRegistry] Deleted profile ${profileId}`);
    }
    getProfileCount() {
        return this.profiles.size;
    }
    // ── Private ───────────────────────────────────────────────────────────────
    _persist(profile) {
        const filePath = path.join(this.profilesDir, `${profile.profileId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf8');
    }
    _loadExisting() {
        if (!fs.existsSync(this.profilesDir))
            return;
        for (const file of fs.readdirSync(this.profilesDir).filter(f => f.endsWith('.json'))) {
            try {
                const raw = JSON.parse(fs.readFileSync(path.join(this.profilesDir, file), 'utf8'));
                raw.createdAt = new Date(raw.createdAt);
                this.profiles.set(raw.profileId, raw);
            }
            catch {
                // Corrupt file — skip
            }
        }
    }
    _ensureDir(dir) {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
}
//# sourceMappingURL=LearningProfile.js.map