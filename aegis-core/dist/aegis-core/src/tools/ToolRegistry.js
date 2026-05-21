export class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    unregister(name) {
        return this.tools.delete(name);
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
}
export const toolRegistry = new ToolRegistry();
