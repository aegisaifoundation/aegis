import React from 'react';
import { render } from 'ink';
import readline from 'readline';
import { Transport } from './Transport.js';
import { App } from '../../../interfaces/terminal/App.js';
import { runtimeExecutor } from '../runtime/index.js';
import { commandRouter } from '../commands/index.js';
import { eventBus } from '../runtime/index.js';

export class TerminalTransport implements Transport {
  async initialize(): Promise<void> {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      console.log("Non-TTY or non-raw terminal detected. Falling back to conversational readline mode.");
      this.startReadlineLoop();
      return;
    }

    try {
      render(React.createElement(App));
    } catch (e: any) {
      console.warn("Failed to render Ink UI. Falling back to conversational readline mode.", e.message);
      this.startReadlineLoop();
    }
  }

  private startReadlineLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n> '
    });

    console.log("AEGIS Core booted. Type a command (e.g. /help) or prompt to begin.");
    
    eventBus.on('response_chunk', (chunk: string) => {
      process.stdout.write(chunk);
    });

    eventBus.on('response_finished', (finalText: string) => {
      process.stdout.write('\n');
    });

    eventBus.on('tool_started', (msg: { name: string; input: string }) => {
      console.log(`\n[Tool execution: ${msg.name} started]`);
    });

    eventBus.on('tool_finished', (msg: { name: string; output: string }) => {
      console.log(`[Tool execution: ${msg.name} finished]`);
    });

    eventBus.on('runtime_error', (msg: string) => {
      console.error(`\n[Runtime Error: ${msg}]`);
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const query = line.trim();
      if (query) {
        try {
          await this.sendInput(query);
        } catch (e: any) {
          console.error(`\n[System Error: ${e.message}]`);
        }
      }
      rl.prompt();
    });

    rl.on('close', () => {
      console.log('Exiting Aegis.');
      process.exit(0);
    });
  }

  async sendInput(input: string): Promise<void> {
    const trimmed = input.trim();
    if (trimmed.startsWith('/')) {
      const commandResult = await commandRouter.handleCommand(trimmed);
      if (commandResult !== null) {
        eventBus.emit('response_started');
        eventBus.emit('response_chunk', commandResult);
        eventBus.emit('response_finished', commandResult);
        return;
      }
    }

    await runtimeExecutor.execute(input);
  }

  sendInterrupt(): void {
    runtimeExecutor.interrupt();
  }
}

export const terminalTransport = new TerminalTransport();

