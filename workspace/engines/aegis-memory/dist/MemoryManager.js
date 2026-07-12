import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager, eventBus, EventTypes, serviceRegistry } from '@aegis/runtime';
import { memoryGateway } from './MemoryGateway.js';
import { MemoryLifecycleState } from './interfaces/MemoryTypes.js';
import { MemoryRefiner } from './refinement/MemoryRefiner.js';
import { memoryLockManager } from './locking/MemoryLockManager.js';
import { MemoryIndexManager } from './indexing/MemoryIndexManager.js';
import { MemoryRecoveryManager } from './recovery/MemoryRecoveryManager.js';
import { memoryCleanupScheduler } from './scheduler/MemoryCleanupScheduler.js';
import { MemoryMigrationManager } from './migration/MemoryMigrationManager.js';
import { calculateChecksum } from './utils/MemoryFileHelpers.js';
import { memoryEventBus } from './eventbus/MemoryEventBus.js';
export class MemoryManager {
    refiner = new MemoryRefiner();
    cache = new Map();
    memories = [];
    /**
     * Initializes the memory system, creating core workspace folders and starting cleanup background task.
     */
    async initialize() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const directories = [
            path.resolve(wsRoot, 'memory'),
            path.resolve(wsRoot, 'memory/sessions'),
            path.resolve(wsRoot, 'memory/snapshots'),
            path.resolve(wsRoot, 'memory/indexes'),
            path.resolve(wsRoot, 'memory/episodic')
        ];
        for (const dir of directories) {
            if (!existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }
        }
        // Start background cleanup scheduler
        memoryCleanupScheduler.start();
        eventBus.emit(EventTypes.MEMORY_INITIALIZED, { sessionId: 'system', details: { status: 'running' } }, 'memory-system');
        // Populate backward compatible cache
        try {
            if (!existsSync(path.resolve(wsRoot, 'memory/sessions/default/metadata.json'))) {
                await this.createSession('default', ['default'], 'system');
            }
            const activeSessionId = await this.getActiveSessionId();
            this.memories = await this.getHistory(activeSessionId, 'system');
        }
        catch (e) {
            console.warn('MemoryManager: Failed to initialize default session cache:', e);
            this.memories = [];
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
    async switchActiveSession(sessionId) {
        this.memories = await this.getHistory(sessionId, 'system');
    }
    /**
     * Legacy initialization method for backward-compatibility.
     */
    async init() {
        await this.initialize();
    }
    async addMemory(role, content, metadata) {
        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            role,
            content,
            timestamp: new Date().toISOString(),
            metadata
        };
        const activeSessionId = await this.getActiveSessionId();
        await this.appendHistory(activeSessionId, role, content, metadata, 'system');
        this.memories.push(message);
    }
    /**
     * Legacy memory retrieval method for backward-compatibility.
     */
    getMemories() {
        return this.memories;
    }
    /**
     * Legacy clear method for backward-compatibility.
     */
    async clear() {
        const activeSessionId = await this.getActiveSessionId();
        const release = await memoryLockManager.acquire(activeSessionId);
        try {
            this.memories = [];
            const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
            const historyPath = path.resolve(wsRoot, `memory/sessions/${activeSessionId}/history.json`);
            await fs.writeFile(historyPath, JSON.stringify({ messages: [], memoryVersion: '1.0.0' }, null, 2), 'utf8');
            const metadataPath = path.resolve(wsRoot, `memory/sessions/${activeSessionId}/metadata.json`);
            if (existsSync(metadataPath)) {
                const meta = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
                meta.checksums.history = calculateChecksum(JSON.stringify({ messages: [], memoryVersion: '1.0.0' }, null, 2));
                await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), 'utf8');
            }
            eventBus.emit(EventTypes.MEMORY_DELETED, { sessionId: activeSessionId, actor: 'system' }, 'memory-system');
        }
        finally {
            release();
        }
    }
    /**
     * Shuts down the cleanup scheduler and releases cached entries.
     */
    async shutdown() {
        memoryCleanupScheduler.stop();
        this.cache.clear();
        eventBus.emit(EventTypes.RUNTIME_SHUTDOWN, { sessionId: 'system', details: { status: 'stopped' } }, 'memory-system');
    }
    // ==========================================
    // Session APIs
    // ==========================================
    async createSession(sessionId, tags = [], actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            const meta = await memoryGateway.createSession(sessionId, tags, actor);
            this.cache.set(sessionId, meta);
            await MemoryIndexManager.registerSession(meta);
            eventBus.emit(EventTypes.SESSION_CREATED, { sessionId, tags, actor }, 'memory-system');
            memoryEventBus.publish({
                eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                topic: 'session.created',
                timestamp: new Date().toISOString(),
                sessionId,
                actor,
                payload: { tags }
            });
            return meta;
        }
        finally {
            release();
        }
    }
    async loadSession(sessionId, actor = 'system') {
        const isCorrupt = await this.verifySessionIntegrity(sessionId);
        if (isCorrupt) {
            eventBus.emit(EventTypes.MEMORY_CORRUPTED, { sessionId }, 'memory-system');
            const recovered = await this.recoverCorruptedMemory(sessionId);
            if (!recovered) {
                eventBus.emit(EventTypes.MEMORY_VALIDATION_FAILED, { sessionId, error: 'Corruption recovery failed' }, 'memory-system');
                throw new Error(`Session ${sessionId} is corrupted and recovery failed.`);
            }
        }
        const release = await memoryLockManager.acquire(sessionId);
        try {
            const meta = await memoryGateway.loadSession(sessionId, actor);
            const migrated = MemoryMigrationManager.migrate(meta);
            if (migrated.memoryVersion !== meta.memoryVersion) {
                const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
                const metadataPath = path.resolve(wsRoot, `memory/sessions/${sessionId}/metadata.json`);
                await fs.writeFile(metadataPath, JSON.stringify(migrated, null, 2), 'utf8');
            }
            this.cache.set(sessionId, migrated);
            await MemoryIndexManager.registerSession(migrated);
            eventBus.emit(EventTypes.SESSION_LOADED, { sessionId, actor }, 'memory-system');
            memoryEventBus.publish({
                eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                topic: 'session.loaded',
                timestamp: new Date().toISOString(),
                sessionId,
                actor,
                payload: { metadata: migrated }
            });
            return migrated;
        }
        finally {
            release();
        }
    }
    async deleteSession(sessionId, actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            await memoryGateway.deleteSession(sessionId, actor);
            this.cache.delete(sessionId);
            await MemoryIndexManager.unregisterSession(sessionId);
            eventBus.emit(EventTypes.MEMORY_DELETED, { sessionId, actor }, 'memory-system');
            memoryEventBus.publish({
                eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                topic: 'session.deleted',
                timestamp: new Date().toISOString(),
                sessionId,
                actor,
                payload: {}
            });
        }
        finally {
            release();
        }
    }
    async archiveSession(sessionId, actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            const meta = await memoryGateway.loadSession(sessionId, actor);
            meta.lifecycleState = MemoryLifecycleState.ARCHIVED;
            meta.updatedAt = new Date().toISOString();
            const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
            const metadataPath = path.resolve(wsRoot, `memory/sessions/${sessionId}/metadata.json`);
            await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), 'utf8');
            this.cache.set(sessionId, meta);
            await MemoryIndexManager.registerSession(meta);
            eventBus.emit(EventTypes.SESSION_ARCHIVED, { sessionId, actor }, 'memory-system');
            memoryEventBus.publish({
                eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                topic: 'session.archived',
                timestamp: new Date().toISOString(),
                sessionId,
                actor,
                payload: {}
            });
        }
        finally {
            release();
        }
    }
    // ==========================================
    // Memory Operations
    // ==========================================
    async getSessionMemory(sessionId, actor = 'system') {
        return await memoryGateway.getSessionMemory(sessionId, actor);
    }
    async updateSessionMemory(sessionId, content, actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            await memoryGateway.updateSessionMemory(sessionId, content, undefined, actor);
            eventBus.emit(EventTypes.MEMORY_UPDATED, { sessionId, memoryType: 'session', actor }, 'memory-system');
        }
        finally {
            release();
        }
    }
    async getWorkingMemory(sessionId, actor = 'system') {
        return await memoryGateway.getWorkingMemory(sessionId, actor);
    }
    async updateWorkingMemory(sessionId, content, actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            await memoryGateway.updateWorkingMemory(sessionId, content, undefined, actor);
            eventBus.emit(EventTypes.MEMORY_UPDATED, { sessionId, memoryType: 'working', actor }, 'memory-system');
        }
        finally {
            release();
        }
    }
    async getTask(sessionId, actor = 'system') {
        return await memoryGateway.getTask(sessionId, actor);
    }
    async updateTask(sessionId, content, actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            await memoryGateway.updateTask(sessionId, content, undefined, actor);
            eventBus.emit(EventTypes.MEMORY_UPDATED, { sessionId, memoryType: 'task', actor }, 'memory-system');
        }
        finally {
            release();
        }
    }
    async appendHistory(sessionId, role, content, metadata, actor = 'system') {
        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            role,
            content,
            timestamp: new Date().toISOString(),
            metadata
        };
        const release = await memoryLockManager.acquire(sessionId);
        try {
            await memoryGateway.appendHistory(sessionId, message, actor);
            eventBus.emit(EventTypes.MEMORY_UPDATED, { sessionId, memoryType: 'history', actor }, 'memory-system');
        }
        finally {
            release();
        }
    }
    async getHistory(sessionId, actor = 'system') {
        return await memoryGateway.getHistory(sessionId, actor);
    }
    async getMetadata(sessionId, actor = 'system') {
        return await this.loadSession(sessionId, actor);
    }
    async updateMetadata(sessionId, metadata, actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            const current = await memoryGateway.loadSession(sessionId, actor);
            const updated = { ...current, ...metadata, updatedAt: new Date().toISOString() };
            const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
            const metadataPath = path.resolve(wsRoot, `memory/sessions/${sessionId}/metadata.json`);
            await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2), 'utf8');
            this.cache.set(sessionId, updated);
            await MemoryIndexManager.registerSession(updated);
            eventBus.emit(EventTypes.MEMORY_UPDATED, { sessionId, memoryType: 'metadata', actor }, 'memory-system');
        }
        finally {
            release();
        }
    }
    // ==========================================
    // Refinement & Compaction
    // ==========================================
    async compress(sessionId, actor = 'system') {
        const release = await memoryLockManager.acquire(sessionId);
        try {
            await this.createSnapshot(sessionId, 'history', actor);
            await this.createSnapshot(sessionId, 'sessionMemory', actor);
            await this.createSnapshot(sessionId, 'workingMemory', actor);
            await this.createSnapshot(sessionId, 'task', actor);
            const working = await memoryGateway.getWorkingMemory(sessionId, actor);
            const refinedWorking = await this.refiner.refineWorkingMemory(sessionId, working);
            await memoryGateway.updateWorkingMemory(sessionId, refinedWorking, undefined, actor);
            eventBus.emit(EventTypes.MEMORY_PRUNED, { sessionId, actor }, 'memory-system');
            const taskContent = await memoryGateway.getTask(sessionId, actor);
            const refinedTask = await this.refiner.refineTaskMemory(sessionId, taskContent);
            await memoryGateway.updateTask(sessionId, refinedTask, undefined, actor);
            const history = await memoryGateway.getHistory(sessionId, actor);
            const sessionMem = await memoryGateway.getSessionMemory(sessionId, actor);
            const refinedSession = await this.refiner.refineSessionMemory(sessionId, history, sessionMem);
            await memoryGateway.updateSessionMemory(sessionId, refinedSession, undefined, actor);
            eventBus.emit(EventTypes.MEMORY_REFINED, { sessionId, actor }, 'memory-system');
            eventBus.emit(EventTypes.MEMORY_COMPRESSED, { sessionId, actor }, 'memory-system');
        }
        finally {
            release();
        }
    }
    // ==========================================
    // Snapshot Management
    // ==========================================
    async createSnapshot(sessionId, fileType, actor = 'system') {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const sessionDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
        const snapshotDir = path.resolve(wsRoot, `memory/snapshots/${sessionId}`);
        if (!existsSync(snapshotDir)) {
            await fs.mkdir(snapshotDir, { recursive: true });
        }
        const fileName = fileType === 'sessionMemory' ? 'session-memory.md' :
            fileType === 'workingMemory' ? 'working-memory.md' :
                fileType === 'task' ? 'task.md' : 'history.json';
        const filePath = path.join(sessionDir, fileName);
        if (!existsSync(filePath)) {
            return '';
        }
        const content = await fs.readFile(filePath, 'utf8');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snapFileName = `${fileType === 'sessionMemory' ? 'session-memory' : fileType === 'workingMemory' ? 'working-memory' : fileType === 'task' ? 'task' : 'history'}-${timestamp}.snap`;
        const snapPath = path.join(snapshotDir, snapFileName);
        await fs.writeFile(snapPath, content, 'utf8');
        eventBus.emit(EventTypes.MEMORY_SNAPSHOT_CREATED, { sessionId, fileType, snapFileName, actor }, 'memory-system');
        memoryEventBus.publish({
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            topic: 'snapshot.created',
            timestamp: new Date().toISOString(),
            sessionId,
            actor,
            payload: { fileType, snapFileName }
        });
        return snapFileName;
    }
    // ==========================================
    // Recovery & Self-Repair
    // ==========================================
    async recoverCorruptedMemory(sessionId) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const sessionDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
        const metadataPath = path.join(sessionDir, 'metadata.json');
        console.log(`[MemoryManager] Running recovery pipeline for session ${sessionId}...`);
        let historyOk = true;
        let sessionOk = true;
        let workingOk = true;
        const historyPath = path.join(sessionDir, 'history.json');
        if (existsSync(historyPath)) {
            try {
                const raw = await fs.readFile(historyPath, 'utf8');
                JSON.parse(raw);
            }
            catch {
                historyOk = await MemoryRecoveryManager.recoverFromSnapshot(sessionId, 'history', historyPath);
            }
        }
        else {
            historyOk = await MemoryRecoveryManager.recoverFromSnapshot(sessionId, 'history', historyPath);
        }
        const sessionPath = path.join(sessionDir, 'session-memory.md');
        if (!existsSync(sessionPath)) {
            sessionOk = await MemoryRecoveryManager.recoverFromSnapshot(sessionId, 'sessionMemory', sessionPath);
        }
        const workingPath = path.join(sessionDir, 'working-memory.md');
        if (!existsSync(workingPath)) {
            workingOk = await MemoryRecoveryManager.recoverFromSnapshot(sessionId, 'workingMemory', workingPath);
        }
        if (!historyOk || !sessionOk || !workingOk) {
            console.error(`[MemoryManager] Integrity recovery aborting. Critical files missing.`);
            return false;
        }
        const hChecksum = existsSync(historyPath) ? calculateChecksum(await fs.readFile(historyPath, 'utf8')) : undefined;
        const sChecksum = existsSync(sessionPath) ? calculateChecksum(await fs.readFile(sessionPath, 'utf8')) : undefined;
        const wChecksum = existsSync(workingPath) ? calculateChecksum(await fs.readFile(workingPath, 'utf8')) : undefined;
        const repaired = await MemoryRecoveryManager.repairMetadata(sessionId, metadataPath, hChecksum, sChecksum, wChecksum);
        this.cache.set(sessionId, repaired);
        await MemoryIndexManager.registerSession(repaired);
        eventBus.emit(EventTypes.MEMORY_RESTORED, { sessionId }, 'memory-system');
        return true;
    }
    async verifySessionIntegrity(sessionId) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const sessionDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
        const metadataPath = path.join(sessionDir, 'metadata.json');
        if (!existsSync(metadataPath))
            return false;
        try {
            const metaRaw = await fs.readFile(metadataPath, 'utf8');
            const meta = JSON.parse(metaRaw);
            if (meta.checksums.history) {
                const historyPath = path.join(sessionDir, 'history.json');
                if (!existsSync(historyPath))
                    return true;
                const current = calculateChecksum(await fs.readFile(historyPath, 'utf8'));
                if (current !== meta.checksums.history)
                    return true;
            }
            if (meta.checksums.sessionMemory) {
                const sessionPath = path.join(sessionDir, 'session-memory.md');
                if (!existsSync(sessionPath))
                    return true;
                const current = calculateChecksum(await fs.readFile(sessionPath, 'utf8'));
                if (current !== meta.checksums.sessionMemory)
                    return true;
            }
            if (meta.checksums.workingMemory) {
                const workingPath = path.join(sessionDir, 'working-memory.md');
                if (!existsSync(workingPath))
                    return true;
                const current = calculateChecksum(await fs.readFile(workingPath, 'utf8'));
                if (current !== meta.checksums.workingMemory)
                    return true;
            }
            if (meta.checksums.task) {
                const taskPath = path.join(sessionDir, 'task.md');
                if (!existsSync(taskPath))
                    return true;
                const current = calculateChecksum(await fs.readFile(taskPath, 'utf8'));
                if (current !== meta.checksums.task)
                    return true;
            }
            return false;
        }
        catch {
            return true;
        }
    }
    /**
     * Manual trigger for cleanups.
     */
    async cleanup() {
        await memoryCleanupScheduler.tick();
    }
}
export const memoryManager = new MemoryManager();
