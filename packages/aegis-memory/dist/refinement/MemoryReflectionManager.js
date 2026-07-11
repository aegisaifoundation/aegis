import fs from 'fs';
import path from 'path';
import { memoryGateway } from '../MemoryGateway.js';
import { workspaceManager } from '@aegis/runtime';
export class MemoryReflectionManager {
    static instance = new MemoryReflectionManager();
    static getInstance() {
        return this.instance;
    }
    getDatabasePath(sessionId) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, `memory/sessions/${sessionId}/reflections/reflections.json`);
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
            console.error(`[MemoryReflectionManager] Failed to load reflections database for session ${sessionId}:`, err);
        }
        return [];
    }
    async save(sessionId, reflections) {
        try {
            const dbPath = this.getDatabasePath(sessionId);
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            const tempPath = `${dbPath}.tmp`;
            await fs.promises.writeFile(tempPath, JSON.stringify(reflections, null, 2), 'utf8');
            await fs.promises.rename(tempPath, dbPath);
        }
        catch (err) {
            console.error(`[MemoryReflectionManager] Failed to save reflections database for session ${sessionId}:`, err);
        }
    }
    async saveReflection(sessionId, record) {
        const reflections = await this.load(sessionId);
        reflections.push(record);
        await this.save(sessionId, reflections);
    }
    async reflect(sessionId, actor = 'system') {
        try {
            const history = await memoryGateway.getHistory(sessionId, actor);
            if (history.length === 0)
                return null;
            const whatWorked = [];
            const whatFailed = [];
            const futureRules = [];
            for (const msg of history) {
                const contentLower = msg.content.toLowerCase();
                if (msg.role === 'tool' && (contentLower.includes('error') || contentLower.includes('failed') || contentLower.includes('timeout'))) {
                    whatFailed.push(`Tool execution error: ${msg.content.substring(0, 80)}...`);
                    futureRules.push(`Always implement timeout retry logic for clinical integrations like ${msg.metadata?.toolName || 'external APIs'}.`);
                }
                if (msg.role === 'assistant' && (contentLower.includes('resolved') || contentLower.includes('successful') || contentLower.includes('completed'))) {
                    whatWorked.push(`Successfully resolved objective: ${msg.content.substring(0, 80)}...`);
                }
                if (msg.role === 'user' && (contentLower.includes('remember') || contentLower.includes('prefer') || contentLower.includes('always'))) {
                    futureRules.push(`Clinician preference: ${msg.content}`);
                }
            }
            if (whatWorked.length === 0) {
                whatWorked.push("Maintained conversation continuity and state verification.");
            }
            if (futureRules.length === 0) {
                futureRules.push("Standardize clinical summary outputs and verify state after changes.");
            }
            const reflection = {
                reflectionId: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                sessionId,
                timestamp: new Date().toISOString(),
                whatWorked: Array.from(new Set(whatWorked)),
                whatFailed: Array.from(new Set(whatFailed)),
                heuristicsGenerated: [...futureRules],
                futureRules: Array.from(new Set(futureRules))
            };
            await this.saveReflection(sessionId, reflection);
            try {
                const state = await memoryGateway.getSessionState(sessionId, actor);
                const prefs = state.preferences || {};
                const existingRules = prefs.futureRules || [];
                prefs.futureRules = Array.from(new Set([...existingRules, ...reflection.futureRules]));
                await memoryGateway.updateSessionState(sessionId, {
                    ...state,
                    preferences: prefs
                }, undefined, actor);
            }
            catch (err) {
                // Safe to ignore if session-state.json is not initialized
            }
            return reflection;
        }
        catch (err) {
            console.error('[MemoryReflectionManager] Failed to run reflection engine:', err);
            return null;
        }
    }
    async getSessionReflections(sessionId) {
        return await this.load(sessionId);
    }
}
export const memoryReflectionManager = MemoryReflectionManager.getInstance();
