import path from 'path';
import { MemoryContext } from '../../aegis-core/src/memory/MemoryContext.js';
import { Persistence } from '../persistence/index.js';

let storagePath = '';
let data: Record<string, any> = {};

export default {
  name: 'profile',
  async initialize(context: MemoryContext): Promise<void> {
    storagePath = path.resolve(context.workspacePath, '../memory/profile.json');
    data = await Persistence.readJson(storagePath);
  },

  async shutdown(): Promise<void> {
    if (storagePath) {
      await Persistence.writeJson(storagePath, data);
    }
  },

  async read(key: string): Promise<any> {
    return data[key];
  },

  async write(key: string, value: any): Promise<void> {
    data[key] = value;
    await Persistence.writeJson(storagePath, data);
  },

  async delete(key: string): Promise<boolean> {
    if (key in data) {
      delete data[key];
      await Persistence.writeJson(storagePath, data);
      return true;
    }
    return false;
  },

  async exists(key: string): Promise<boolean> {
    return key in data;
  }
};
