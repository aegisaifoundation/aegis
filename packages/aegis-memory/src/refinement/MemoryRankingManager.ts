import fs from 'fs';
import path from 'path';
import { workspaceManager } from '@aegis/runtime';

export interface RankedMemoryItem {
  id: string;
  sessionId: string;
  text: string;
  importance: number;
  confidence: number;
  accessFrequency: number;
  createdAt: string;
  lastAccessedAt: string;
  decayRate: number;
}

export interface ArchiveRecord {
  archiveId: string;
  sessionId: string;
  archivedAt: string;
  items: Omit<RankedMemoryItem, 'vector'>[];
}

export class MemoryRankingManager {
  private static instance = new MemoryRankingManager();
  private items: RankedMemoryItem[] = [];
  private isLoaded = false;

  public static getInstance(): MemoryRankingManager {
    return this.instance;
  }

  private getDatabasePath(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'memory/indexes/ranking.json');
  }

  private getArchiveDirectory(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'memory/archives');
  }

  public async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const dbPath = this.getDatabasePath();
      if (fs.existsSync(dbPath)) {
        const raw = await fs.promises.readFile(dbPath, 'utf8');
        this.items = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[MemoryRankingManager] Failed to load ranking database:', err);
      this.items = [];
    }
    this.isLoaded = true;
  }

  public async save(): Promise<void> {
    try {
      const dbPath = this.getDatabasePath();
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const tempPath = `${dbPath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(this.items, null, 2), 'utf8');
      await fs.promises.rename(tempPath, dbPath);
    } catch (err) {
      console.error('[MemoryRankingManager] Failed to save ranking database:', err);
    }
  }

  public async insert(
    id: string,
    sessionId: string,
    text: string,
    importance = 0.5,
    confidence = 0.5,
    decayRate = 0.05
  ): Promise<void> {
    await this.load();
    const existingIndex = this.items.findIndex(item => item.id === id);
    const newItem: RankedMemoryItem = {
      id,
      sessionId,
      text,
      importance,
      confidence,
      accessFrequency: 1,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      decayRate
    };

    if (existingIndex >= 0) {
      // Retain access metrics on update
      newItem.accessFrequency = this.items[existingIndex].accessFrequency;
      this.items[existingIndex] = newItem;
    } else {
      this.items.push(newItem);
    }
    await this.save();
  }

  public async recordAccess(id: string): Promise<void> {
    await this.load();
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.accessFrequency += 1;
      item.lastAccessedAt = new Date().toISOString();
      await this.save();
    }
  }

  public calculateScore(item: RankedMemoryItem, virtualTimeOffsetMs = 0): number {
    const lastAccessTime = new Date(item.lastAccessedAt).getTime();
    const futureTime = Date.now() + virtualTimeOffsetMs;
    const ageMs = Math.max(0, futureTime - lastAccessTime);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    const baseScore = item.importance * item.confidence;
    const decay = Math.exp(-item.decayRate * ageDays);
    const frequencyMultiplier = 1 + Math.log(item.accessFrequency);

    return baseScore * decay * frequencyMultiplier;
  }

  public async sweepSessionMemory(
    sessionId: string,
    virtualTimeOffsetMs = 0,
    archiveThreshold = 0.3
  ): Promise<{ active: RankedMemoryItem[]; archived: Omit<RankedMemoryItem, 'vector'>[] }> {
    await this.load();

    const active: RankedMemoryItem[] = [];
    const archived: RankedMemoryItem[] = [];

    for (const item of this.items) {
      if (item.sessionId === sessionId) {
        const score = this.calculateScore(item, virtualTimeOffsetMs);
        if (score < archiveThreshold) {
          archived.push(item);
        } else {
          active.push(item);
        }
      }
    }

    if (archived.length > 0) {
      // Remove archived items from active list
      const archivedIds = new Set(archived.map(i => i.id));
      this.items = this.items.filter(item => !archivedIds.has(item.id));
      await this.save();

      // Save to archive directory
      const archiveDir = this.getArchiveDirectory();
      if (!fs.existsSync(archiveDir)) {
        await fs.promises.mkdir(archiveDir, { recursive: true });
      }

      const archiveRecord: ArchiveRecord = {
        archiveId: `arc_${Date.now()}`,
        sessionId,
        archivedAt: new Date().toISOString(),
        items: archived
      };

      const archivePath = path.join(archiveDir, `archive_${sessionId}_${Date.now()}.json`);
      await fs.promises.writeFile(archivePath, JSON.stringify(archiveRecord, null, 2), 'utf8');
    }

    return { active, archived };
  }

  public async getSessionItems(sessionId: string): Promise<RankedMemoryItem[]> {
    await this.load();
    return this.items.filter(item => item.sessionId === sessionId);
  }
}

export const memoryRankingManager = MemoryRankingManager.getInstance();
