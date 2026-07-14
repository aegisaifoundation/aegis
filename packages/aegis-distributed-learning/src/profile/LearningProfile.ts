import type { ILearningProfile, LearningDomain, LoRAConfig, DataCategory } from '../types/index.js';
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
export class LearningProfile implements ILearningProfile {
  readonly profileId: string;
  readonly name: string;
  readonly baseModelId: string;
  readonly domain: LearningDomain;
  readonly loraConfig: LoRAConfig;
  readonly dataConstraints: DataCategory[];
  readonly defaultStrategy: string;
  readonly createdAt: Date;
  readonly metadata: Record<string, any>;

  constructor(params: Omit<ILearningProfile, 'profileId' | 'createdAt'> & { profileId?: string }) {
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
  private profiles: Map<string, ILearningProfile> = new Map();
  private profilesDir: string;

  constructor(workspacePath: string) {
    this.profilesDir = path.join(workspacePath, 'learning', 'profiles');
    this._ensureDir(this.profilesDir);
    this._loadExisting();
  }

  /**
   * Register a new learning profile.
   * Throws if a profile with the same ID already exists.
   */
  registerProfile(profile: ILearningProfile): void {
    if (this.profiles.has(profile.profileId)) {
      throw new Error(`[ProfileRegistry] Profile ${profile.profileId} already exists.`);
    }
    this.profiles.set(profile.profileId, profile);
    this._persist(profile);
    console.log(`[ProfileRegistry] Registered profile '${profile.name}' (${profile.profileId})`);
  }

  getProfile(profileId: string): ILearningProfile | undefined {
    return this.profiles.get(profileId);
  }

  /** Find profiles by domain */
  getProfilesByDomain(domain: LearningDomain): ILearningProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.domain === domain);
  }

  listProfiles(): ILearningProfile[] {
    return Array.from(this.profiles.values());
  }

  /** Update a profile's metadata (non-structural fields only) */
  updateProfile(profileId: string, updates: Partial<Pick<ILearningProfile, 'metadata'>>): void {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error(`[ProfileRegistry] Profile ${profileId} not found.`);
    const updated = { ...profile, metadata: { ...profile.metadata, ...updates.metadata } };
    this.profiles.set(profileId, updated);
    this._persist(updated);
  }

  deleteProfile(profileId: string): void {
    const profile = this.profiles.get(profileId);
    if (!profile) return;
    this.profiles.delete(profileId);
    const filePath = path.join(this.profilesDir, `${profileId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.log(`[ProfileRegistry] Deleted profile ${profileId}`);
  }

  getProfileCount(): number {
    return this.profiles.size;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _persist(profile: ILearningProfile): void {
    const filePath = path.join(this.profilesDir, `${profile.profileId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf8');
  }

  private _loadExisting(): void {
    if (!fs.existsSync(this.profilesDir)) return;
    for (const file of fs.readdirSync(this.profilesDir).filter(f => f.endsWith('.json'))) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(this.profilesDir, file), 'utf8'));
        raw.createdAt = new Date(raw.createdAt);
        this.profiles.set(raw.profileId, raw as ILearningProfile);
      } catch {
        // Corrupt file — skip
      }
    }
  }

  private _ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
