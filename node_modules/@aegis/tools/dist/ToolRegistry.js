import { ToolState } from './Tool.js';
import { eventBus } from '@aegis/runtime';
export class ToolRegistry {
    tools = new Map();
    states = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
        this.states.set(tool.name, ToolState.REGISTERED);
        eventBus.emit('tool_registered', { name: tool.name, version: tool.version });
    }
    unregister(name) {
        const deleted = this.tools.delete(name);
        if (deleted) {
            this.states.set(name, ToolState.DISABLED);
            eventBus.emit('tool_unregistered', { name });
        }
        return deleted;
    }
    getTool(name) {
        return this.tools.get(name);
    }
    getAllTools() {
        return Array.from(this.tools.values());
    }
    hasTool(name) {
        return this.tools.has(name);
    }
    setToolState(name, state) {
        this.states.set(name, state);
    }
    getToolState(name) {
        return this.states.get(name);
    }
}
export const toolRegistry = new ToolRegistry();
