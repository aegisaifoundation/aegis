import fs from 'fs';
import path from 'path';
import { workspaceManager } from '@aegis/runtime';
export class MemoryRankingManager {
    static instance = new MemoryRankingManager();
    items = [];
    isLoaded = false;
    static getInstance() {
        return this.instance;
    }
    getDatabasePath() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, 'memory/indexes/ranking.json');
    }
    getArchiveDirectory() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, 'memory/archives');
    }
    async load() {
        if (this.isLoaded)
            return;
        try {
            const dbPath = this.getDatabasePath();
            if (fs.existsSync(dbPath)) {
                const raw = await fs.promises.readFile(dbPath, 'utf8');
                this.items = JSON.parse(raw);
            }
        }
        catch (err) {
            console.error('[MemoryRankingManager] Failed to load ranking database:', err);
            this.items = [];
        }
        this.isLoaded = true;
    }
    async save() {
        try {
            const dbPath = this.getDatabasePath();
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            const tempPath = `${dbPath}.tmp`;
            await fs.promises.writeFile(tempPath, JSON.stringify(this.items, null, 2), 'utf8');
            await fs.promises.rename(tempPath, dbPath);
        }
        catch (err) {
            console.error('[MemoryRankingManager] Failed to save ranking database:', err);
        }
    }
    async insert(id, sessionId, text, importance = 0.5, confidence = 0.5, decayRate = 0.05) {
        await this.load();
        const existingIndex = this.items.findIndex(item => item.id === id);
        const newItem = {
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
        }
        else {
            this.items.push(newItem);
        }
        await this.save();
    }
    async recordAccess(id) {
        await this.load();
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.accessFrequency += 1;
            item.lastAccessedAt = new Date().toISOString();
            await this.save();
        }
    }
    calculateScore(item, virtualTimeOffsetMs = 0) {
        const lastAccessTime = new Date(item.lastAccessedAt).getTime();
        const futureTime = Date.now() + virtualTimeOffsetMs;
        const ageMs = Math.max(0, futureTime - lastAccessTime);
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        const baseScore = item.importance * item.confidence;
        const decay = Math.exp(-item.decayRate * ageDays);
        const frequencyMultiplier = 1 + Math.log(item.accessFrequency);
        return baseScore * decay * frequencyMultiplier;
    }
    async sweepSessionMemory(sessionId, virtualTimeOffsetMs = 0, archiveThreshold = 0.3) {
        await this.load();
        const active = [];
        const archived = [];
        for (const item of this.items) {
            if (item.sessionId === sessionId) {
                const score = this.calculateScore(item, virtualTimeOffsetMs);
                if (score < archiveThreshold) {
                    archived.push(item);
                }
                else {
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
            const archiveRecord = {
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
    async getSessionItems(sessionId) {
        await this.load();
        return this.items.filter(item => item.sessionId === sessionId);
    }
}
export const memoryRankingManager = MemoryRankingManager.getInstance();
