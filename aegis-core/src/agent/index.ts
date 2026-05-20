import {
  modelHandler,
  ChatMessage
} from '../models/index.js';

import {
  toolRegistry
} from '../tools/index.js';

import {
  MemoryManager
} from '../memory/index.js';

import {
  PromptBuilder
} from '../runtime/builders/PromptBuilder.js';

import {
  agentRuntime
} from '../runtime/runtime/AgentRuntime.js';

import { EventEmitter } from 'events';

export class Agent extends EventEmitter {

  private isThinking: boolean = false;

  private shouldInterrupt: boolean = false;

  private memoryManager!: MemoryManager;

  async initialize() {

    const context =
      agentRuntime.getContext();

    this.memoryManager =
      new MemoryManager(
        context.memoryPath
      );

    await this.memoryManager.init();
  }

  async processInput(
    userInput: string
  ) {

    if (this.isThinking) {

      this.shouldInterrupt = true;

      return;
    }

    this.isThinking = true;

    this.shouldInterrupt = false;

    this.emit('status', 'thinking');

    try {

      await this.memoryManager.addMemory(
        'user',
        userInput
      );

      const context =
        agentRuntime.getContext();

      const systemPrompt =
        PromptBuilder.build(context);

      const messages: ChatMessage[] = [

        {
          role: 'system',
          content: systemPrompt
        },

        ...this.memoryManager
          .getMemories()
          .map(m => ({
            role: m.role as
              | 'user'
              | 'assistant'
              | 'system',

            content: m.content
          }))
      ];

      let fullResponse = '';

      const stream =
        modelHandler.streamChat(messages);

      for await (const token of stream) {

        if (this.shouldInterrupt) {

          this.emit(
            'chunk',
            '\n[Interrupted]\n'
          );

          break;
        }

        fullResponse += token;

        this.emit('chunk', token);
      }

      await this.memoryManager.addMemory(
        'assistant',
        fullResponse
      );

      await this.handlePotentialTools(
        fullResponse
      );

    } catch (error: any) {

      this.emit(
        'error',
        error.message
      );

    } finally {

      this.isThinking = false;

      this.emit('status', 'idle');
    }
  }

  private async handlePotentialTools(
    response: string
  ) {

    const toolMatch =
      response.match(
        /<tool>(.*?)<\/tool>/s
      );

    if (toolMatch && toolMatch[1]) {

      try {

        this.emit(
          'status',
          'executing_tool'
        );

        const toolCall =
          JSON.parse(toolMatch[1]);

        const tool =
          toolRegistry.getTool(
            toolCall.name
          );

        if (tool) {

          this.emit(
            'tool_start',
            `Executing ${tool.name}...`
          );

          const result =
            await tool.execute(
              toolCall.input
            );

          this.emit(
            'tool_end',
            result
          );

          await this.memoryManager.addMemory(
            'system',
            `Tool Result from ${tool.name}:\n${result}`
          );

          await this.processInput(
            'Tool execution finished. Continue reasoning.'
          );

        } else {

          this.emit(
            'tool_end',
            `Tool ${toolCall.name} not found.`
          );
        }

      } catch (e: any) {

        this.emit(
          'tool_end',
          `Failed to parse or execute tool: ${e.message}`
        );
      }
    }
  }

  interrupt() {
    this.shouldInterrupt = true;
  }
}

export const agent = new Agent();