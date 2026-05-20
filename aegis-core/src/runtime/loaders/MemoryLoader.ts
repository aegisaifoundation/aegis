import path from 'path';

export class MemoryLoader {

  static getMemoryPath(
    agentName: string
  ): string {

    const root = process.cwd();

    return path.join(
      root,
      '..',
      'memory',
      agentName,
      'sessions',
      'default.json'
    );
  }
}