import fs from 'fs';
import path from 'path';
import { memoryGateway } from '../MemoryGateway.js';
import { workspaceManager } from '../../runtime/WorkspaceManager.js';

export interface ReflectionRecord {
  reflectionId: string;
  sessionId: string;
  timestamp: string;
  whatWorked: string[];
  whatFailed: string[];
  heuristicsGenerated: string[];
  futureRules: string[];
}

export class MemoryReflectionManager {
  private static instance = new MemoryReflectionManager();
  private reflections: ReflectionRecord[] = [];
  private isLoaded = false;

  public static getInstance(): MemoryReflectionManager {
    return this.instance;
  }

  private getDatabasePath(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'memory/reflections/reflections.json');
  }

  public async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const dbPath = this.getDatabasePath();
      if (fs.existsSync(dbPath)) {
        const raw = await fs.promises.readFile(dbPath, 'utf8');
        this.reflections = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[MemoryReflectionManager] Failed to load reflections database:', err);
      this.reflections = [];
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
      await fs.promises.writeFile(tempPath, JSON.stringify(this.reflections, null, 2), 'utf8');
      await fs.promises.rename(tempPath, dbPath);
    } catch (err) {
      console.error('[MemoryReflectionManager] Failed to save reflections database:', err);
    }
  }

  private async saveReflection(record: ReflectionRecord): Promise<void> {
    await this.load();
    this.reflections.push(record);
    await this.save();
  }

  public async reflect(sessionId: string, actor = 'system'): Promise<ReflectionRecord | null> {
    try {
      const history = await memoryGateway.getHistory(sessionId, actor);
      if (history.length === 0) return null;

      const whatWorked: string[] = [];
      const whatFailed: string[] = [];
      const futureRules: string[] = [];

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

      const reflection: ReflectionRecord = {
        reflectionId: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        sessionId,
        timestamp: new Date().toISOString(),
        whatWorked: Array.from(new Set(whatWorked)),
        whatFailed: Array.from(new Set(whatFailed)),
        heuristicsGenerated: [...futureRules],
        futureRules: Array.from(new Set(futureRules))
      };

      await this.saveReflection(reflection);

      try {
        const state = await memoryGateway.getSessionState(sessionId, actor);
        const prefs = state.preferences || {};
        const existingRules = prefs.futureRules || [];
        prefs.futureRules = Array.from(new Set([...existingRules, ...reflection.futureRules]));
        
        await memoryGateway.updateSessionState(sessionId, {
          ...state,
          preferences: prefs
        }, undefined, actor);
      } catch (err) {
        // Safe to ignore if session-state.json is not initialized
      }

      return reflection;
    } catch (err) {
      console.error('[MemoryReflectionManager] Failed to run reflection engine:', err);
      return null;
    }
  }

  public async getSessionReflections(sessionId: string): Promise<ReflectionRecord[]> {
    await this.load();
    return this.reflections.filter(ref => ref.sessionId === sessionId);
  }
}

export const memoryReflectionManager = MemoryReflectionManager.getInstance();
