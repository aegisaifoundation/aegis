import { toolRegistry } from '../../tools/index.js';

import { AgentLoader } from '../loaders/AgentLoader.js';
import { SoulLoader } from '../loaders/SoulLoader.js';
import { SkillLoader } from '../loaders/SkillLoader.js';
import { MemoryLoader } from '../loaders/MemoryLoader.js';

import {
  RuntimeContext
} from '../context/RuntimeContext.js';

export class AgentRuntime {

  private context!: RuntimeContext;

  async initialize() {

    const agentName =
      process.env.AEGIS_AGENT || 'doctor';

    const agent =
      await AgentLoader.load(agentName);

    const soul =
      await SoulLoader.load(agentName);

    const skills =
      await SkillLoader.load(agentName);

    const tools =
      toolRegistry.getAllTools();

    const memoryPath =
      MemoryLoader.getMemoryPath(agentName);

    this.context = {
      agent,
      soul,
      skills,
      tools,
      memoryPath
    };
  }

  getContext(): RuntimeContext {
    return this.context;
  }
}

export const agentRuntime =
  new AgentRuntime();