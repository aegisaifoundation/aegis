import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
import { PythonProcessManager } from '../ipc/PythonProcessManager.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export class FolderConnector implements IDataConnector {
  readonly id: string;
  readonly type = 'Folder';
  private folderPath = '';
  private connected = false;

  constructor(id: string, private pythonManager: PythonProcessManager) {
    this.id = id;
  }

  async connect(config: { path: string }): Promise<void> {
    if (!config.path) {
      throw new Error('Folder path must be provided');
    }
    this.folderPath = path.resolve(config.path);
    if (!existsSync(this.folderPath)) {
      throw new Error(`Directory path does not exist: ${config.path}`);
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async collect(): Promise<RawSample[]> {
    if (!this.connected) throw new Error('Connector is not connected');
    const samples: RawSample[] = [];
    await this.scanDirectory(this.folderPath, samples);
    return samples;
  }

  async validate(): Promise<boolean> {
    return this.connected && existsSync(this.folderPath);
  }

  async watch(onChange: (event: any) => void): Promise<void> {
    // Watch logic is orchestrated by DataSourceManager
  }

  async metadata(): Promise<Record<string, any>> {
    return {
      folderPath: this.folderPath,
      connected: this.connected
    };
  }

  async statistics(): Promise<Record<string, any>> {
    if (!this.folderPath || !existsSync(this.folderPath)) {
      return { filesCount: 0 };
    }
    const samples = await this.collect();
    return {
      filesCount: samples.length,
      totalCharacters: samples.reduce((acc, s) => acc + s.content.length, 0)
    };
  }

  private async scanDirectory(dir: string, samples: RawSample[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, samples);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        let content = '';
        
        try {
          if (ext === '.pdf') {
            content = await this.pythonManager.request('pdf_parse', fullPath);
          } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            content = await this.pythonManager.request('ocr_parse', fullPath);
          } else if (ext === '.wav' || ext === '.mp3') {
            content = await this.pythonManager.request('audio_transcribe', fullPath);
          } else if (['.txt', '.md', '.markdown', '.json', '.xml', '.csv'].includes(ext)) {
            content = await fs.readFile(fullPath, 'utf8');
          } else {
            // Skip unsupported extensions
            continue;
          }

          samples.push({
            id: `file-${Buffer.from(fullPath).toString('hex').substring(0, 16)}`,
            content,
            metadata: {
              sourcePath: fullPath,
              fileName: entry.name,
              fileSize: (await fs.stat(fullPath)).size,
              extension: ext
            }
          });
        } catch (err: any) {
          // Log parsing error but continue collecting other files
          samples.push({
            id: `file-error-${Buffer.from(fullPath).toString('hex').substring(0, 16)}`,
            content: `[Error parsing file: ${err.message}]`,
            metadata: {
              sourcePath: fullPath,
              fileName: entry.name,
              error: err.message
            }
          });
        }
      }
    }
  }
}
