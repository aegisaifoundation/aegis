import fs from 'fs/promises';
import path from 'path';

import {
  AgentConfig
} from '../context/RuntimeContext.js';

export class AgentLoader {
  static async load(
    agentName: string
  ): Promise<AgentConfig> {

    const root = process.cwd();

    const filePath = path.join(
      root,
      '..',
      'agents',
      agentName,
      'agent.json'
    );

    const data = await fs.readFile(
      filePath,
      'utf-8'
    );

    return JSON.parse(data);
  }
}