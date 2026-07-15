import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
export class VersionManager {
    datasetDir;
    historyPath;
    constructor(datasetDir) {
        this.datasetDir = datasetDir;
        this.historyPath = path.join(datasetDir, 'versions/history.json');
    }
    async initialize() {
        const dir = path.dirname(this.historyPath);
        if (!existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
        }
        if (!existsSync(this.historyPath)) {
            await fs.writeFile(this.historyPath, JSON.stringify([], null, 2), 'utf8');
        }
    }
    async getHistory() {
        if (!existsSync(this.historyPath))
            return [];
        try {
            const data = await fs.readFile(this.historyPath, 'utf8');
            return JSON.parse(data);
        }
        catch {
            return [];
        }
    }
    async createVersion(params) {
        const history = await this.getHistory();
        const nextVerNum = history.length + 1;
        const version = nextVerNum.toString();
        const dataHash = crypto.createHash('sha256').update(params.data).digest('hex');
        const newVersion = {
            version,
            parentVersion: params.parentVersion,
            timestamp: new Date().toISOString(),
            dataHash,
            pipelineVersion: params.pipelineVersion,
            privacyRulesVersion: params.privacyRulesVersion,
            description: params.description
        };
        history.push(newVersion);
        await fs.writeFile(this.historyPath, JSON.stringify(history, null, 2), 'utf8');
        // Save copy of this version metadata to versions/
        const versionFile = path.join(this.datasetDir, `versions/version_${version}.json`);
        await fs.writeFile(versionFile, JSON.stringify(newVersion, null, 2), 'utf8');
        return newVersion;
    }
    async getVersion(version) {
        const history = await this.getHistory();
        return history.find(v => v.version === version);
    }
}
