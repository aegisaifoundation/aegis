import fs from 'fs/promises';
import path from 'path';

import { toolRegistry } from '../../tools/index.js';

export class ToolLoader {

  static async load(
    agentName: string
  ) {

    const root = process.cwd();

    const sharedPath = path.join(
      root,
      '..',
      'tools',
      'shared'
    );

    const agentPath = path.join(
      root,
      '..',
      'tools',
      agentName
    );

    await this.loadToolsFrom(sharedPath);

    await this.loadToolsFrom(agentPath);
  }

  private static async loadToolsFrom(
    folder: string
  ) {

    try {

      const entries =
        await fs.readdir(folder, {
          withFileTypes: true
        });

      for (const entry of entries) {

        if (!entry.isDirectory()) continue;

        const modulePath = path.join(
          folder,
          entry.name,
          'index.ts'
        );

        const module =
          await import(modulePath);

        const ToolClass =
          Object.values(module)[0] as any;

        const tool =
          new ToolClass();

        toolRegistry.register(tool);
      }

    } catch (err) {

      console.error(
        'ToolLoader Error:',
        err
      );
    }
  }
}