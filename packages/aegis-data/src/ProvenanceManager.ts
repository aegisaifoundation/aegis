import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface ProvenanceRecord {
  sampleId: string;
  datasetId: string;
  datasetVersion: string;
  originalSource: string; // e.g. Folder, DB connection, Memory session ID
  connectorId: string;
  timestamp: string;
  pipelineVersion: string;
  privacyRulesVersion: string;
}

export class ProvenanceManager {
  private provenancePath: string;

  constructor(datasetDir: string) {
    this.provenancePath = path.join(datasetDir, 'metadata_provenance.json');
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.provenancePath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async saveProvenance(records: ProvenanceRecord[]): Promise<void> {
    let existing: ProvenanceRecord[] = [];
    if (existsSync(this.provenancePath)) {
      try {
        const raw = await fs.readFile(this.provenancePath, 'utf8');
        existing = JSON.parse(raw) as ProvenanceRecord[];
      } catch {}
    }
    const updated = [...existing, ...records];
    await fs.writeFile(this.provenancePath, JSON.stringify(updated, null, 2), 'utf8');
  }

  async getProvenanceForSample(sampleId: string): Promise<ProvenanceRecord | undefined> {
    if (!existsSync(this.provenancePath)) return undefined;
    try {
      const raw = await fs.readFile(this.provenancePath, 'utf8');
      const records = JSON.parse(raw) as ProvenanceRecord[];
      return records.find(r => r.sampleId === sampleId);
    } catch {
      return undefined;
    }
  }

  async listProvenance(): Promise<ProvenanceRecord[]> {
    if (!existsSync(this.provenancePath)) return [];
    try {
      const raw = await fs.readFile(this.provenancePath, 'utf8');
      return JSON.parse(raw) as ProvenanceRecord[];
    } catch {
      return [];
    }
  }
}
