import path from 'path';
import fs from 'fs/promises';
import { existsSync, watch, FSWatcher } from 'fs';

export interface DataSource {
  sourceId: string;
  name: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
  registeredAt: string;
}

export class DataSourceManager {
  private sourcesPath: string;
  private sources = new Map<string, DataSource>();
  private watchers = new Map<string, FSWatcher>();

  constructor(workspaceRoot: string) {
    this.sourcesPath = path.resolve(workspaceRoot, '.aegis/datasets/sources.json');
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.sourcesPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    if (existsSync(this.sourcesPath)) {
      try {
        const raw = await fs.readFile(this.sourcesPath, 'utf8');
        const list = JSON.parse(raw) as DataSource[];
        for (const src of list) {
          this.sources.set(src.sourceId, src);
          if (src.enabled && src.type === 'Folder') {
            this.startFolderWatcher(src);
          }
        }
      } catch {
        this.sources.clear();
      }
    }
  }

  async save(): Promise<void> {
    const list = Array.from(this.sources.values());
    await fs.writeFile(this.sourcesPath, JSON.stringify(list, null, 2), 'utf8');
  }

  async registerSource(source: Omit<DataSource, 'registeredAt'>): Promise<DataSource> {
    // Validate permission rules
    await this.validateSourcePermissions(source);

    const entry: DataSource = {
      ...source,
      registeredAt: new Date().toISOString()
    };
    this.sources.set(entry.sourceId, entry);
    await this.save();

    if (entry.enabled && entry.type === 'Folder') {
      this.startFolderWatcher(entry);
    }

    return entry;
  }

  async removeSource(sourceId: string): Promise<boolean> {
    this.stopWatcher(sourceId);
    const deleted = this.sources.delete(sourceId);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  async enableSource(sourceId: string): Promise<boolean> {
    const src = this.sources.get(sourceId);
    if (src) {
      src.enabled = true;
      await this.save();
      if (src.type === 'Folder') {
        this.startFolderWatcher(src);
      }
      return true;
    }
    return false;
  }

  async disableSource(sourceId: string): Promise<boolean> {
    const src = this.sources.get(sourceId);
    if (src) {
      src.enabled = false;
      await this.save();
      this.stopWatcher(sourceId);
      return true;
    }
    return false;
  }

  getSource(sourceId: string): DataSource | undefined {
    return this.sources.get(sourceId);
  }

  listSources(): DataSource[] {
    return Array.from(this.sources.values());
  }

  private async validateSourcePermissions(source: Omit<DataSource, 'registeredAt'>): Promise<void> {
    if (source.type === 'Folder') {
      const folderPath = source.config.path;
      if (!folderPath) {
        throw new Error('Folder path is required in config');
      }
      
      // Sandbox checks: resolve and ensure it exists
      const resolved = path.resolve(folderPath);
      if (!existsSync(resolved)) {
        throw new Error(`Directory does not exist or access denied: ${folderPath}`);
      }
      
      const stats = await fs.stat(resolved);
      if (!stats.isDirectory()) {
        throw new Error(`Provided path is not a directory: ${folderPath}`);
      }
    }
  }

  private startFolderWatcher(source: DataSource): void {
    this.stopWatcher(source.sourceId);
    const folderPath = source.config.path;
    if (!folderPath || !existsSync(folderPath)) return;

    try {
      const watcher = watch(folderPath, { recursive: true }, (event, filename) => {
        // Emit source change event
        // In real setup, triggers pipeline updates
      });
      this.watchers.set(source.sourceId, watcher);
    } catch {
      // Ignore watch setup failures on unpermitted or locking folders
    }
  }

  private stopWatcher(sourceId: string): void {
    const watcher = this.watchers.get(sourceId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sourceId);
    }
  }

  shutdown(): void {
    for (const sourceId of this.watchers.keys()) {
      this.stopWatcher(sourceId);
    }
  }
}
