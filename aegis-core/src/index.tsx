import React from 'react';
import { render } from 'ink';
import { App } from './terminal/App.js';
import { memoryManager } from './memory/index.js';
import { toolRegistry } from './tools/index.js';
import { FileTool } from './tools/FileTool.js';
import { TerminalTool } from './tools/TerminalTool.js';
import { SystemTool } from './tools/SystemTool.js';
import { MemoryTool } from './tools/MemoryTool.js';
import { modelHandler } from './models/index.js';

async function bootstrap() {
  await memoryManager.init();

  toolRegistry.register(new FileTool());
  toolRegistry.register(new TerminalTool());
  toolRegistry.register(new SystemTool());
  toolRegistry.register(new MemoryTool());

  const available = await modelHandler.checkModelAvailability();
  if (!available) {
    console.warn('\nWarning: Configured model might not be available in Ollama right now. Please ensure Ollama is running and the model is pulled.\n');
  }

  render(<App />);
}

bootstrap().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
