import { Tool } from '../../tools/index.js';

export interface AgentConfig {
  name: string;
  description?: string;
  model?: string;
  permissions?: string[];
}

export interface SoulDefinition {
  identity: string;
  mission: string;
  ethics: string;
  behavior: string;
  communication: string;
  policies: string;
  constraints: string;
}

export interface SkillDefinition {
  name: string;
  content: string;
}

export interface RuntimeContext {
  agent: AgentConfig;
  soul: SoulDefinition;
  skills: SkillDefinition[];
  tools: Tool[];
  memoryPath: string;
}