import { toolRegistry } from '../tools/index.js';
import { pluginRegistry } from '../plugins/PluginRegistry.js';
export class PromptBuilder {
    buildSystemPrompt() {
        const tools = toolRegistry.getAllTools();
        const plugins = pluginRegistry.list();
        let prompt = `You are Aegis Core Agent, an advanced modular AI orchestrator.\n`;
        prompt += `You have access to dynamic tools. To execute a task, you MUST use the appropriate tool if available.\n`;
        prompt += `To invoke a tool, output a JSON block wrapped in <tool>...</tool> tags. Do not output anything else in the same turn.\n\n`;
        prompt += `Format structure:\n`;
        prompt += `<tool>{\n`;
        prompt += `  "name": "ToolName",\n`;
        prompt += `  "input": {\n`;
        prompt += `    "action": "actionName",\n`;
        prompt += `    ...otherParameters\n`;
        prompt += `  }\n`;
        prompt += `}</tool>\n\n`;
        prompt += `Example: To create a file named "note.txt" with content "hello", output:\n`;
        prompt += `<tool>{"name": "FileTool", "input": {"action": "createFile", "path": "note.txt", "content": "hello"}}</tool>\n\n`;
        if (tools.length > 0) {
            prompt += `Available Tools:\n`;
            for (const tool of tools) {
                prompt += `- ${tool.name}: ${tool.description}\n`;
            }
            prompt += `\n`;
        }
        else {
            prompt += `No tools are currently registered.\n\n`;
        }
        if (plugins.length > 0) {
            prompt += `Active Background Plugins:\n`;
            for (const plugin of plugins) {
                const state = pluginRegistry.getPluginState(plugin.name);
                prompt += `- ${plugin.name} (v${plugin.version}) [State: ${state}]: ${plugin.description}\n`;
            }
            prompt += `Note: Plugins are infrastructure extensions running in the background. You do not invoke them directly, but they handle logging, telemetry, caching, encryption, persistence, notifications, monitoring, and analytics dynamically.\n\n`;
        }
        else {
            prompt += `No background plugins are currently active.\n\n`;
        }
        prompt += `Response Guidelines:\n`;
        prompt += `1. Provide clear, concise, and structured answers.\n`;
        prompt += `2. If you need to use a tool, generate the <tool> block. Do not output anything else in the same turn that would conflict with the tool execution.\n`;
        return prompt;
    }
}
export const promptBuilder = new PromptBuilder();
