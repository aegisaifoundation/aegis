import { Tool, ToolState } from './Tool.js';
import { eventBus } from '@aegis/runtime';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private states: Map<string, ToolState> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.states.set(tool.name, ToolState.REGISTERED);
    eventBus.emit('tool_registered', { name: tool.name, version: tool.version });
  }

  unregister(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      this.states.set(name, ToolState.DISABLED);
      eventBus.emit('tool_unregistered', { name });
    }
    return deleted;
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  setToolState(name: string, state: ToolState): void {
    this.states.set(name, state);
  }

  getToolState(name: string): ToolState | undefined {
    return this.states.get(name);
  }
}

export const toolRegistry = new ToolRegistry();

