import fs from 'fs/promises';
import path from 'path';

import {
  SoulDefinition
} from '../context/RuntimeContext.js';

export class SoulLoader {
  static async load(
    agentName: string
  ): Promise<SoulDefinition> {

    const root = process.cwd();

    const soulPath = path.join(
      root,
      '..',
      'soul',
      agentName
    );

    async function read(file: string) {
      return fs.readFile(
        path.join(soulPath, file),
        'utf-8'
      );
    }

    return {
      identity: await read('identity.md'),
      mission: await read('mission.md'),
      ethics: await read('ethics.md'),
      behavior: await read('behavior.md'),
      communication: await read('communication.md'),
      policies: await read('policies.md'),
      constraints: await read('constraints.md')
    };
  }
}