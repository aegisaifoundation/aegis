import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { MemoryContext } from '../../aegis-core/src/memory/MemoryContext.js';

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

async function getFilePath(): Promise<string> {
  const wsRoot = path.dirname(workspacePath);
  const activeSessionId = await getActiveSessionId();
  return path.resolve(wsRoot, 'memory/sessions', activeSessionId, 'session-memory.md');
}

export default {
  name: 'session',
  async initialize(context: MemoryContext): Promise<void> {
    workspacePath = context.workspacePath;
  },

  async shutdown(): Promise<void> {
    // No-op for markdown-based memory
  },

  async read(key: string): Promise<any> {
    const filePath = await getFilePath();
    if (!existsSync(filePath)) return undefined;
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    let inTargetHeader = false;
    const headerLower = '## preferences';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('##')) {
        if (trimmed.toLowerCase() === headerLower) {
          inTargetHeader = true;
        } else {
          inTargetHeader = false;
        }
        continue;
      }
      
      if (inTargetHeader) {
        const match = trimmed.match(/^-\s+(?:\*\*)?([^*:]+)(?:\*\*)?:\s*(.*)$/);
        if (match) {
          const itemKey = match[1].trim();
          const itemVal = match[2].trim();
          if (itemKey === key) {
            try {
              return JSON.parse(itemVal);
            } catch {
              return itemVal;
            }
          }
        }
      }
    }
    return undefined;
  },

  async write(key: string, value: any): Promise<void> {
    const filePath = await getFilePath();
    const header = '## Preferences';
    if (!existsSync(filePath)) {
      await fs.writeFile(filePath, `${header}\n`, 'utf8');
    }
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    let inTargetHeader = false;
    const headerLower = '## preferences';
    let keyFound = false;
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const newLine = `- **${key}**: ${valueStr}`;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('##')) {
        if (trimmed.toLowerCase() === headerLower) {
          inTargetHeader = true;
        } else {
          inTargetHeader = false;
        }
        continue;
      }
      
      if (inTargetHeader) {
        const match = trimmed.match(/^-\s+(?:\*\*)?([^*:]+)(?:\*\*)?:\s*(.*)$/);
        if (match) {
          const itemKey = match[1].trim();
          if (itemKey === key) {
            const indent = line.match(/^\s*/)?.[0] || '';
            lines[i] = `${indent}${newLine}`;
            keyFound = true;
            break;
          }
        }
      }
    }
    
    if (!keyFound) {
      inTargetHeader = false;
      let insertIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('##')) {
          if (trimmed.toLowerCase() === headerLower) {
            inTargetHeader = true;
            continue;
          } else if (inTargetHeader) {
            insertIndex = i;
            break;
          }
        }
      }
      
      if (insertIndex === -1) {
        if (inTargetHeader) {
          lines.push(newLine);
        } else {
          lines.push('', header, newLine);
        }
      } else {
        lines.splice(insertIndex, 0, newLine);
      }
    }
    
    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  },

  async delete(key: string): Promise<boolean> {
    const filePath = await getFilePath();
    if (!existsSync(filePath)) return false;
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    let inTargetHeader = false;
    const headerLower = '## preferences';
    let keyDeleted = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('##')) {
        if (trimmed.toLowerCase() === headerLower) {
          inTargetHeader = true;
        } else {
          inTargetHeader = false;
        }
        continue;
      }
      
      if (inTargetHeader) {
        const match = trimmed.match(/^-\s+(?:\*\*)?([^*:]+)(?:\*\*)?:\s*(.*)$/);
        if (match) {
          const itemKey = match[1].trim();
          if (itemKey === key) {
            lines.splice(i, 1);
            keyDeleted = true;
            break;
          }
        }
      }
    }
    
    if (keyDeleted) {
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
      return true;
    }
    return false;
  },

  async exists(key: string): Promise<boolean> {
    const val = await this.read(key);
    return val !== undefined;
  }
};
