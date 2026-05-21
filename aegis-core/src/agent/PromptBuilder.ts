import { toolRegistry } from '../tools/index.js';

export class PromptBuilder {
  buildSystemPrompt(): string {
    const tools = toolRegistry.getAllTools();
    let prompt = `You are Aegis Core Agent, an advanced modular AI orchestrator.\n`;
    prompt += `You can execute tasks using tools by outputting a JSON block wrapped in <tool> tags.\n`;
    prompt += `Example: <tool>{"name": "FileTool", "input": "read file.txt"}</tool>\n\n`;
    
    if (tools.length > 0) {
      prompt += `Available Tools:\n`;
      for (const tool of tools) {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      }
      prompt += `\n`;
    } else {
      prompt += `No tools are currently registered.\n\n`;
    }
    
    prompt += `Response Guidelines:\n`;
    prompt += `1. Provide clear, concise, and structured answers.\n`;
    prompt += `2. If you need to use a tool, generate the <tool> block. Do not output anything else in the same turn that would conflict with the tool execution.\n`;
    return prompt;
  }
}

export const promptBuilder = new PromptBuilder();
