import fs from 'fs';
import path from 'path';
import { workspaceManager, serviceRegistry } from '@aegis/runtime';
export class MemoryRankingManager {
    static instance = new MemoryRankingManager();
    static getInstance() {
        return this.instance;
    }
    getDatabasePath(sessionId) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, `memory/sessions/${sessionId}/indexes/ranking.json`);
    }
    getArchiveDirectory(sessionId) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, `memory/sessions/${sessionId}/archives`);
    }
    async load(sessionId) {
        try {
            const dbPath = this.getDatabasePath(sessionId);
            if (fs.existsSync(dbPath)) {
                const raw = await fs.promises.readFile(dbPath, 'utf8');
                return JSON.parse(raw);
            }
        }
        catch (err) {
            console.error(`[MemoryRankingManager] Failed to load ranking database for session ${sessionId}:`, err);
        }
        return [];
    }
    async save(sessionId, items) {
        try {
            const dbPath = this.getDatabasePath(sessionId);
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            const tempPath = `${dbPath}.tmp`;
            await fs.promises.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
            await fs.promises.rename(tempPath, dbPath);
        }
        catch (err) {
            console.error(`[MemoryRankingManager] Failed to save ranking database for session ${sessionId}:`, err);
        }
    }
    async insert(id, sessionId, text, importance = 0.5, confidence = 0.5, decayRate = 0.05) {
        const items = await this.load(sessionId);
        const existingIndex = items.findIndex(item => item.id === id);
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
            newItem.accessFrequency = items[existingIndex].accessFrequency;
            items[existingIndex] = newItem;
        }
        else {
            items.push(newItem);
        }
        await this.save(sessionId, items);
    }
    async recordAccess(id) {
        const activeSessionId = await this.getActiveSessionId();
        const items = await this.load(activeSessionId);
        const item = items.find(i => i.id === id);
        if (item) {
            item.accessFrequency += 1;
            item.lastAccessedAt = new Date().toISOString();
            await this.save(activeSessionId, items);
        }
    }
    async getActiveSessionId() {
        try {
            const runtimeStateManager = serviceRegistry.get('runtimeStateManager');
            const state = await runtimeStateManager.loadState();
            return state.activeSessionId || 'default';
        }
        catch {
            return 'default';
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
        const items = await this.load(sessionId);
        const active = [];
        const archived = [];
        for (const item of items) {
            const score = this.calculateScore(item, virtualTimeOffsetMs);
            if (score < archiveThreshold) {
                archived.push(item);
            }
            else {
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
        return await this.load(sessionId);
    }
}
export const memoryRankingManager = MemoryRankingManager.getInstance();
