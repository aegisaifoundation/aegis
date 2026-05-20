import 'dotenv/config';
import React from 'react';

import { render } from 'ink';

import { App } from './terminal/App.js';

import { toolRegistry } from './tools/index.js';



import { modelHandler } from './models/index.js';

import {
  agentRuntime
} from './runtime/runtime/AgentRuntime.js';

import {
  agent
} from './agent/index.js';

async function bootstrap() {

  await agentRuntime.initialize();

  await agent.initialize();

  const available =
    await modelHandler.checkModelAvailability();

  if (!available) {

    console.warn(
      '\\nWarning: Configured model might not be available in Ollama right now.\\n'
    );
  }

  render(<App />);
}

bootstrap().catch(err => {

  console.error(
    'Fatal Error:',
    err
  );

  process.exit(1);
});