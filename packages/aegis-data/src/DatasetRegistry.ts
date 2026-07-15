import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface DatasetPolicy {
  allowTraining: boolean;
  allowKnowledgeExtraction: boolean;
  allowFederatedLearning: boolean;
  allowSwarmLearning: boolean;
  allowExport: boolean;
}

export interface DatasetMetadata {
  datasetId: string;
  name: string;
  owner: string;
  version: string;
  source: string;
  privacy: string;
  status: 'Created' | 'Collecting' | 'Processed' | 'Failed';
  samples: number;
  language: string;
  policies: DatasetPolicy;
  createdAt: string;
  updatedAt: string;
}

export class DatasetRegistry {
  private registryPath: string;
  private datasets = new Map<string, DatasetMetadata>();

  constructor(workspaceRoot: string) {
    this.registryPath = path.resolve(workspaceRoot, '.aegis/datasets/registry.json');
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.registryPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    if (existsSync(this.registryPath)) {
      try {
        const raw = await fs.readFile(this.registryPath, 'utf8');
        const list = JSON.parse(raw) as DatasetMetadata[];
        for (const meta of list) {
          this.datasets.set(meta.datasetId, meta);
        }
      } catch (err) {
        // Fallback if registry file corrupt
        this.datasets.clear();
      }
    }
  }

  async save(): Promise<void> {
    const list = Array.from(this.datasets.values());
    await fs.writeFile(this.registryPath, JSON.stringify(list, null, 2), 'utf8');
  }

  async register(metadata: Omit<DatasetMetadata, 'createdAt' | 'updatedAt'>): Promise<DatasetMetadata> {
    const now = new Date().toISOString();
    const entry: DatasetMetadata = {
      ...metadata,
      createdAt: now,
      updatedAt: now
    };
    this.datasets.set(entry.datasetId, entry);
    await this.save();
    return entry;
  }

  async remove(datasetId: string): Promise<boolean> {
    if (this.datasets.has(datasetId)) {
      this.datasets.delete(datasetId);
      await this.save();
      return true;
    }
    return false;
  }

  get(datasetId: string): DatasetMetadata | undefined {
    return this.datasets.get(datasetId);
  }

  list(): DatasetMetadata[] {
    return Array.from(this.datasets.values());
  }

  async updateStatus(datasetId: string, status: DatasetMetadata['status'], samples?: number, language?: string): Promise<void> {
    const entry = this.datasets.get(datasetId);
    if (entry) {
      entry.status = status;
      if (samples !== undefined) entry.samples = samples;
      if (language !== undefined) entry.language = language;
      entry.updatedAt = new Date().toISOString();
      await this.save();
    }
  }

  async updateVersion(datasetId: string, version: string): Promise<void> {
    const entry = this.datasets.get(datasetId);
    if (entry) {
      entry.version = version;
      entry.updatedAt = new Date().toISOString();
      await this.save();
    }
  }
}
