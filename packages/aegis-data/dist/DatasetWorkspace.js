import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
export class DatasetWorkspace {
    baseDir;
    constructor(workspaceRoot, datasetId) {
        this.baseDir = path.resolve(workspaceRoot, '.aegis/datasets', datasetId);
    }
    async initialize() {
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
    getBasePath() {
        return this.baseDir;
    }
    getSubdirPath(subdir) {
        return path.join(this.baseDir, subdir);
    }
    async writeMetadata(metadata) {
        const metaPath = path.join(this.baseDir, 'metadata.json');
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
    }
    async readMetadata() {
        const metaPath = path.join(this.baseDir, 'metadata.json');
        if (!existsSync(metaPath))
            return null;
        try {
            const data = await fs.readFile(metaPath, 'utf8');
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    }
    async cleanWorkspace() {
        if (existsSync(this.baseDir)) {
            await fs.rm(this.baseDir, { recursive: true, force: true });
        }
    }
}
