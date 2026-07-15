import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export class DatasetWorkspace {
  private baseDir: string;

  constructor(workspaceRoot: string, datasetId: string) {
    this.baseDir = path.resolve(workspaceRoot, '.aegis/datasets', datasetId);
  }

  async initialize(): Promise<void> {
    const subdirs = [
      '',
      'raw',
      'processed',
      'cache',
      'chunks',
      'tokens',
      'statistics',
      'versions',
      'logs'
    ];
    for (const subdir of subdirs) {
      const dirPath = path.join(this.baseDir, subdir);
      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
      }
    }
  }

  getBasePath(): string {
    return this.baseDir;
  }

  getSubdirPath(subdir: 'raw' | 'processed' | 'cache' | 'chunks' | 'tokens' | 'statistics' | 'versions' | 'logs'): string {
    return path.join(this.baseDir, subdir);
  }

  async writeMetadata(metadata: Record<string, any>): Promise<void> {
    const metaPath = path.join(this.baseDir, 'metadata.json');
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  async readMetadata(): Promise<Record<string, any> | null> {
    const metaPath = path.join(this.baseDir, 'metadata.json');
    if (!existsSync(metaPath)) return null;
    try {
      const data = await fs.readFile(metaPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async cleanWorkspace(): Promise<void> {
    if (existsSync(this.baseDir)) {
      await fs.rm(this.baseDir, { recursive: true, force: true });
    }
  }
}
