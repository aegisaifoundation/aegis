import fs from 'fs';
import path from 'path';
import { workspaceManager, serviceRegistry } from '@aegis/runtime';

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

  public static getInstance(): MemoryRankingManager {
    return this.instance;
  }

  private getDatabasePath(sessionId: string): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, `memory/sessions/${sessionId}/indexes/ranking.json`);
  }

  private getArchiveDirectory(sessionId: string): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, `memory/sessions/${sessionId}/archives`);
  }

  public async load(sessionId: string): Promise<RankedMemoryItem[]> {
    try {
      const dbPath = this.getDatabasePath(sessionId);
      if (fs.existsSync(dbPath)) {
        const raw = await fs.promises.readFile(dbPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`[MemoryRankingManager] Failed to load ranking database for session ${sessionId}:`, err);
    }
    return [];
  }

  public async save(sessionId: string, items: RankedMemoryItem[]): Promise<void> {
    try {
      const dbPath = this.getDatabasePath(sessionId);
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const tempPath = `${dbPath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
      await fs.promises.rename(tempPath, dbPath);
    } catch (err) {
      console.error(`[MemoryRankingManager] Failed to save ranking database for session ${sessionId}:`, err);
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
    const items = await this.load(sessionId);
    const existingIndex = items.findIndex(item => item.id === id);
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
      newItem.accessFrequency = items[existingIndex].accessFrequency;
      items[existingIndex] = newItem;
    } else {
      items.push(newItem);
    }
    await this.save(sessionId, items);
  }

  public async recordAccess(id: string): Promise<void> {
    const activeSessionId = await this.getActiveSessionId();
    const items = await this.load(activeSessionId);
    const item = items.find(i => i.id === id);
    if (item) {
      item.accessFrequency += 1;
      item.lastAccessedAt = new Date().toISOString();
      await this.save(activeSessionId, items);
    }
  }

  private async getActiveSessionId(): Promise<string> {
    try {
      const runtimeStateManager: any = serviceRegistry.get('runtimeStateManager');
      const state = await runtimeStateManager.loadState();
      return state.activeSessionId || 'default';
    } catch {
      return 'default';
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
    const items = await this.load(sessionId);

    const active: RankedMemoryItem[] = [];
    const archived: RankedMemoryItem[] = [];

    for (const item of items) {
      const score = this.calculateScore(item, virtualTimeOffsetMs);
      if (score < archiveThreshold) {
        archived.push(item);
      } else {
        active.push(item);
      }
    }

    if (archived.length > 0) {
      // Remove archived items from active list
      const archivedIds = new Set(archived.map(i => i.id));
      const remainingItems = items.filter(item => !archivedIds.has(item.id));
      await this.save(sessionId, remainingItems);

      // Save to archive directory
      const archiveDir = this.getArchiveDirectory(sessionId);
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
    return await this.load(sessionId);
  }
}

export const memoryRankingManager = MemoryRankingManager.getInstance();
