import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
export class DatasetRegistry {
    registryPath;
    datasets = new Map();
    constructor(workspaceRoot) {
        this.registryPath = path.resolve(workspaceRoot, '.aegis/datasets/registry.json');
    }
    async initialize() {
        const dir = path.dirname(this.registryPath);
        if (!existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
        }
        if (existsSync(this.registryPath)) {
            try {
                const raw = await fs.readFile(this.registryPath, 'utf8');
                const list = JSON.parse(raw);
                for (const meta of list) {
                    this.datasets.set(meta.datasetId, meta);
                }
            }
            catch (err) {
                // Fallback if registry file corrupt
                this.datasets.clear();
            }
        }
    }
    async save() {
        const list = Array.from(this.datasets.values());
        await fs.writeFile(this.registryPath, JSON.stringify(list, null, 2), 'utf8');
    }
    async register(metadata) {
        const now = new Date().toISOString();
        const entry = {
            ...metadata,
            createdAt: now,
            updatedAt: now
        };
        this.datasets.set(entry.datasetId, entry);
        await this.save();
        return entry;
    }
    async remove(datasetId) {
        if (this.datasets.has(datasetId)) {
            this.datasets.delete(datasetId);
            await this.save();
            return true;
        }
        return false;
    }
    get(datasetId) {
        return this.datasets.get(datasetId);
    }
    list() {
        return Array.from(this.datasets.values());
    }
    async updateStatus(datasetId, status, samples, language) {
        const entry = this.datasets.get(datasetId);
        if (entry) {
            entry.status = status;
            if (samples !== undefined)
                entry.samples = samples;
            if (language !== undefined)
                entry.language = language;
            entry.updatedAt = new Date().toISOString();
            await this.save();
        }
    }
    async updateVersion(datasetId, version) {
        const entry = this.datasets.get(datasetId);
        if (entry) {
            entry.version = version;
            entry.updatedAt = new Date().toISOString();
            await this.save();
        }
    }
}
