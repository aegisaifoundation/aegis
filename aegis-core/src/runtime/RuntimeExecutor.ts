import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eventBus } from './EventBus.js';
import { conversationContext } from '../context/ConversationContext.js';
import { agent } from '../agent/index.js';
import { toolParser } from './ToolParser.js';
import { toolRegistry, type ToolContext } from '../tools/index.js';
import { RuntimeStatus } from '../types/Runtime.js';
import { workspaceManager } from './WorkspaceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runtimeConfigPath = path.resolve(__dirname, '../config/runtime.json');
let runtimeConfig = {
  maxReasoningSteps: 5,
  maxToolExecutions: 5,
  streamResponses: true,
  enableInterruptions: true
};

try {
  if (fs.existsSync(runtimeConfigPath)) {
    runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
  }
} catch (e) {
  console.warn('Failed to load runtime.json, using default options', e);
}

export class RuntimeExecutor {
  private status: RuntimeStatus = 'IDLE';
  private maxSteps: number = runtimeConfig.maxReasoningSteps || 5;

  getStatus(): RuntimeStatus {
    return this.status;
  }

  setStatus(status: RuntimeStatus) {
    this.status = status;
  }

  async execute(userInput: string): Promise<void> {
    if (this.status !== 'IDLE') {
      throw new Error(`Cannot execute input; current state is ${this.status}`);
    }

    try {
      this.status = 'THINKING';
      eventBus.emit('execution_started', { input: userInput });
      eventBus.emit('message_received', { role: 'user', content: userInput });
      eventBus.emit('thinking_started');

      // Add user message to context
      await conversationContext.addMessage('user', userInput);

      let step = 0;
      let completed = false;

      while (step < this.maxSteps && !completed && (this.status as string) !== 'INTERRUPTED') {
        step++;
        eventBus.emit('loop_step', { step, maxSteps: this.maxSteps });

        // Retrieve messages for model prompt
        const messages = await conversationContext.getMessages();

        this.status = 'THINKING';
        eventBus.emit('response_started');

        let assistantContent = '';
        try {
          const stream = agent.streamChat(messages);

          for await (const chunk of stream) {
            if ((this.status as string) === 'INTERRUPTED') {
              break;
            }
            assistantContent += chunk;
            eventBus.emit('response_chunk', chunk);
          }
        } catch (err: any) {
          if ((this.status as string) === 'INTERRUPTED') {
            break;
          }
          throw err;
        }

        if ((this.status as string) === 'INTERRUPTED') {
          break;
        }

        eventBus.emit('response_finished', assistantContent);
        eventBus.emit('message_received', { role: 'assistant', content: assistantContent });
        eventBus.emit('thinking_finished');

        // Add assistant response to history
        await conversationContext.addMessage('assistant', assistantContent);

        // Parse tool calls from the assistant response
        const toolCalls = toolParser.parse(assistantContent);

        if (toolCalls.length > 0) {
          this.status = 'EXECUTING_TOOL';
          
          for (const toolCall of toolCalls) {
            if ((this.status as string) === 'INTERRUPTED') break;

            const tool = toolRegistry.getTool(toolCall.name);
            eventBus.emit('tool_started', { name: toolCall.name, input: toolCall.input });

            let observation = '';
            if (!tool) {
              observation = `Error: Tool '${toolCall.name}' not found.`;
            } else {
              try {
                const context: ToolContext = {
                  workspacePath: workspaceManager.getWorkspacePath(),
                  sessionId: 'default',
                  permissions: tool.permissions || {},
                  runtimeMetadata: {
                    maxSteps: this.maxSteps
                  },
                  activeAgentId: 'aegis-core-agent',
                  runtimeConfig: runtimeConfig
                };
                observation = await tool.execute(toolCall.input, context);
              } catch (err: any) {
                observation = `Error executing tool '${toolCall.name}': ${err.message || err}`;
              }
            }

            eventBus.emit('tool_finished', { name: toolCall.name, output: observation });
            
            // Add tool observation to context
            await conversationContext.addMessage('tool', observation, { toolName: toolCall.name });
          }

          // Loop continues to next iteration (thinking step) with tool observation in context
        } else {
          // No tool calls, so ReAct loop is complete
          completed = true;
        }
      }

      if ((this.status as string) === 'INTERRUPTED') {
        eventBus.emit('interrupt');
        eventBus.emit('execution_completed', { input: userInput, status: 'INTERRUPTED' });
      } else {
        this.status = 'COMPLETED';
        eventBus.emit('execution_completed', { input: userInput, status: 'COMPLETED' });
      }
    } catch (error: any) {
      this.status = 'ERROR';
      eventBus.emit('runtime_error', error.message || String(error));
      eventBus.emit('execution_completed', { input: userInput, status: 'ERROR', error: error.message || String(error) });
    } finally {
      if ((this.status as string) !== 'INTERRUPTED') {
        this.status = 'IDLE';
      }
    }
  }

  interrupt(): void {
    if (this.status === 'THINKING' || this.status === 'EXECUTING_TOOL') {
      this.status = 'INTERRUPTED';
    }
  }
}

export const runtimeExecutor = new RuntimeExecutor();
