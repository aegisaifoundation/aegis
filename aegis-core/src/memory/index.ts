import fs from 'fs/promises';
import path from 'path';

export interface MemoryEntry {

  role: 'user' | 'assistant' | 'system';

  content: string;

  timestamp: string;
}

export class MemoryManager {

  private sessionFile: string;

  private memories: MemoryEntry[] = [];

  constructor(sessionFile: string) {

    this.sessionFile = sessionFile;

  }

  async init() {

    try {

      await fs.mkdir(
        path.dirname(this.sessionFile),
        {
          recursive: true
        }
      );

      try {

        const data = await fs.readFile(
          this.sessionFile,
          'utf-8'
        );

        this.memories = JSON.parse(data);

      } catch (err: any) {

        if (err.code === 'ENOENT') {

          this.memories = [];

          await this.save();

        } else {

          throw err;

        }
      }

    } catch (err) {

      console.error(
        'Failed to initialize memory:',
        err
      );

    }
  }

  async addMemory(
    role: 'user' | 'assistant' | 'system',
    content: string
  ) {

    this.memories.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    await this.save();
  }

  getMemories(): MemoryEntry[] {
    return this.memories;
  }

  async clear() {

    this.memories = [];

    await this.save();
  }

  private async save() {

    await fs.writeFile(
      this.sessionFile,
      JSON.stringify(this.memories, null, 2),
      'utf-8'
    );
  }
}