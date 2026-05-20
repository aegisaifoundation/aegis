import { modelHandler, ChatMessage } from '../models/index.js';
import { toolRegistry } from '../tools/index.js';
import { memoryManager } from '../memory/index.js';
import { EventEmitter } from 'events';

export class Agent extends EventEmitter {
  private isThinking: boolean = false;
  private shouldInterrupt: boolean = false;

  constructor() {
    super();
  }

  async processInput(userInput: string) {
    if (this.isThinking) {
      this.shouldInterrupt = true;
      return;
    }

    this.isThinking = true;
    this.shouldInterrupt = false;
    this.emit('status', 'thinking');

    try {
      await memoryManager.addMemory('user', userInput);
      
      const systemPrompt = this.buildSystemPrompt();
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...memoryManager.getMemories().map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content
        }))
      ];

      let fullResponse = '';
      const stream = modelHandler.streamChat(messages);
      
      for await (const token of stream) {
        if (this.shouldInterrupt) {
          this.emit('chunk', '\n[Interrupted]\n');
          break;
        }
        fullResponse += token;
        this.emit('chunk', token);
      }

      await memoryManager.addMemory('assistant', fullResponse);
      
      // Simple Tool Execution Check (Normally we'd parse <tool> tags or JSON)
      await this.handlePotentialTools(fullResponse);

    } catch (error: any) {
      this.emit('error', error.message);
    } finally {
      this.isThinking = false;
      this.emit('status', 'idle');
    }
  }

  private buildSystemPrompt(): string {
    const tools = toolRegistry.getAllTools();
    let prompt = `You are Aegis Core Agent, an advanced terminal-based AI orchestrator.\n`;
    prompt += `You have access to the following tools. To use a tool, output a JSON block wrapped in <tool> tags, e.g. <tool>{"name":"FileTool","input":"{\\"action\\":\\"list\\"}"}</tool>.\n\n`;
    
    for (const tool of tools) {
      prompt += `- ${tool.name}: ${tool.description}\n`;
    }

    return prompt;
  }

  private async handlePotentialTools(response: string) {
    const toolMatch = response.match(/<tool>(.*?)<\/tool>/s);
    if (toolMatch && toolMatch[1]) {
      try {
        this.emit('status', 'executing_tool');
        const toolCall = JSON.parse(toolMatch[1]);
        const tool = toolRegistry.getTool(toolCall.name);
        
        if (tool) {
          this.emit('tool_start', `Executing ${tool.name}...`);
          const result = await tool.execute(toolCall.input);
          this.emit('tool_end', result);
          
          // Feed result back to model
          await memoryManager.addMemory('system', `Tool Result from ${tool.name}:\n${result}`);
          // Recurse to let model process tool output (limited depth in prod)
          await this.processInput('Tool execution finished. Please summarize or continue.');
        } else {
          this.emit('tool_end', `Tool ${toolCall.name} not found.`);
        }
      } catch (e: any) {
         this.emit('tool_end', `Failed to parse or execute tool: ${e.message}`);
      }
    }
  }

  interrupt() {
    this.shouldInterrupt = true;
  }
}

export const agent = new Agent();
