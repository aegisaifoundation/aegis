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
  name: 'profile',
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
      const tempContext = state.temporaryExecutionContext || {};
      return tempContext[key];
    } catch {
      return undefined;
    }
  },

  async write(key: string, value: any): Promise<void> {
    const activeSessionId = await getActiveSessionId();
    const state = await memoryGateway.getSessionState(activeSessionId);
    const tempContext = state.temporaryExecutionContext || {};
    tempContext[key] = value;
    
    await sessionStateManager.updateSessionState(activeSessionId, {
      temporaryExecutionContext: tempContext
    });
  },

  async delete(key: string): Promise<boolean> {
    const activeSessionId = await getActiveSessionId();
    try {
      const state = await memoryGateway.getSessionState(activeSessionId);
      const tempContext = state.temporaryExecutionContext || {};
      if (key in tempContext) {
        delete tempContext[key];
        await sessionStateManager.updateSessionState(activeSessionId, {
          temporaryExecutionContext: tempContext
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
      const tempContext = state.temporaryExecutionContext || {};
      return key in tempContext;
    } catch {
      return false;
    }
  }
};
