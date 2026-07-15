import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
export class ProvenanceManager {
    provenancePath;
    constructor(datasetDir) {
        this.provenancePath = path.join(datasetDir, 'metadata_provenance.json');
    }
    async initialize() {
        const dir = path.dirname(this.provenancePath);
        if (!existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
        }
    }
    async saveProvenance(records) {
        let existing = [];
        if (existsSync(this.provenancePath)) {
            try {
                const raw = await fs.readFile(this.provenancePath, 'utf8');
                existing = JSON.parse(raw);
            }
            catch { }
        }
        const updated = [...existing, ...records];
        await fs.writeFile(this.provenancePath, JSON.stringify(updated, null, 2), 'utf8');
    }
    async getProvenanceForSample(sampleId) {
        if (!existsSync(this.provenancePath))
            return undefined;
        try {
            const raw = await fs.readFile(this.provenancePath, 'utf8');
            const records = JSON.parse(raw);
            return records.find(r => r.sampleId === sampleId);
        }
        catch {
            return undefined;
        }
    }
    async listProvenance() {
        if (!existsSync(this.provenancePath))
            return [];
        try {
            const raw = await fs.readFile(this.provenancePath, 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
}
