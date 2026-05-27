import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { MemoryContext } from '../../aegis-core/src/memory/MemoryContext.js';
import { memoryGateway } from '../../aegis-core/src/memory/MemoryGateway.js';
import { sessionStateManager } from '../../aegis-core/src/runtime/SessionStateManager.js';

let workspacePath = '';

async function getActiveSessionId(): Promise<string> {
  const wsRoot = path.dirname(workspacePath);
  const statePath = path.resolve(wsRoot, 'runtime/runtime-state.json');
  if (existsSync(statePath)) {
    try {
      const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
      return state.activeSessionId || 'default';
    } catch {
      return 'default';
    }
  }
  return 'default';
}

export default {
  name: 'session',
  async initialize(context: MemoryContext): Promise<void> {
    workspacePath = context.workspacePath;
  },

  async shutdown(): Promise<void> {
    // No-op
  },

  async read(key: string): Promise<any> {
    const activeSessionId = await getActiveSessionId();
    try {
      const state = await memoryGateway.getSessionState(activeSessionId);
      const prefs = state.preferences || {};
      return prefs[key];
    } catch {
      return undefined;
    }
  },

  async write(key: string, value: any): Promise<void> {
    const activeSessionId = await getActiveSessionId();
    const state = await memoryGateway.getSessionState(activeSessionId);
    const prefs = state.preferences || {};
    prefs[key] = value;
    
    await sessionStateManager.updateSessionState(activeSessionId, {
      preferences: prefs
    });
  },

  async delete(key: string): Promise<boolean> {
    const activeSessionId = await getActiveSessionId();
    try {
      const state = await memoryGateway.getSessionState(activeSessionId);
      const prefs = state.preferences || {};
      if (key in prefs) {
        delete prefs[key];
        await sessionStateManager.updateSessionState(activeSessionId, {
          preferences: prefs
        });
        return true;
      }
    } catch {}
    return false;
  },

  async exists(key: string): Promise<boolean> {
    const activeSessionId = await getActiveSessionId();
    try {
      const state = await memoryGateway.getSessionState(activeSessionId);
      const prefs = state.preferences || {};
      return key in prefs;
    } catch {
      return false;
    }
  }
};
