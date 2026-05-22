import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

let pluginContext: PluginContext | null = null;

function getContext(): PluginContext {
  if (!pluginContext) {
    throw new Error("Persistence plugin has not been initialized yet.");
  }
  return pluginContext;
}

export default {
  name: "persistence",
  category: "shared",
  description: "General persistence adapters: reading/writing state files from/to workspace",
  version: "1.0.0",

  async initialize(context: PluginContext): Promise<void> {
    pluginContext = context;
    const logger = context.services.getLogger();
    logger.info("Persistence plugin initialized.");
  },

  async shutdown(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info("Persistence plugin shut down.");
    pluginContext = null;
  },

  async writeState(key: string, data: any): Promise<void> {
    const ctx = getContext();
    const workspacePath = ctx.services.getWorkspacePath();
    const stateDir = path.join(workspacePath, 'state');
    const stateFile = path.join(stateDir, `${key}.json`);

    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(stateFile, JSON.stringify(data, null, 2), 'utf8');
  },

  async readState(key: string): Promise<any | null> {
    const ctx = getContext();
    const workspacePath = ctx.services.getWorkspacePath();
    const stateFile = path.join(workspacePath, 'state', `${key}.json`);

    try {
      if (!existsSync(stateFile)) return null;
      const data = await fs.readFile(stateFile, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },

  async deleteState(key: string): Promise<boolean> {
    const ctx = getContext();
    const workspacePath = ctx.services.getWorkspacePath();
    const stateFile = path.join(workspacePath, 'state', `${key}.json`);

    try {
      if (!existsSync(stateFile)) return false;
      await fs.unlink(stateFile);
      return true;
    } catch (e) {
      return false;
    }
  }
};
