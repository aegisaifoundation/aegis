import fs from 'fs/promises';
import path from 'path';

import {
  SkillDefinition
} from '../context/RuntimeContext.js';

export class SkillLoader {
  static async load(
    agentName: string
  ): Promise<SkillDefinition[]> {

    const root = process.cwd();

    const skillsPath = path.join(
      root,
      '..',
      'skills',
      agentName
    );

    const entries = await fs.readdir(
      skillsPath,
      {
        withFileTypes: true
      }
    );

    const skills: SkillDefinition[] = [];

    for (const entry of entries) {

      if (!entry.isDirectory()) continue;

      const skillName = entry.name;

      const promptPath = path.join(
        skillsPath,
        skillName,
        'prompt.md'
      );

      try {

        const content = await fs.readFile(
          promptPath,
          'utf-8'
        );

        skills.push({
          name: skillName,
          content
        });

      } catch {
        continue;
      }
    }

    return skills;
  }
}