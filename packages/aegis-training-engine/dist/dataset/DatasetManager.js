import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { serviceRegistry } from '@aegis/runtime';
export class DatasetManager {
    workspaceRoot;
    constructor(workspaceRoot = process.cwd()) {
        this.workspaceRoot = workspaceRoot;
    }
    getAde() {
        if (serviceRegistry.has('aegis-data')) {
            return serviceRegistry.get('aegis-data');
        }
        return null;
    }
    async LoadDataset(datasetId) {
        const ade = this.getAde();
        if (ade) {
            const status = ade.DatasetStatus(datasetId);
            if (status !== 'Processed') {
                throw new Error(`Dataset "${datasetId}" has status "${status}". It must be "Processed" prior to loading.`);
            }
        }
        const datasetDir = path.resolve(this.workspaceRoot, '.aegis/datasets', datasetId);
        const filePath = path.join(datasetDir, 'processed/dataset.jsonl');
        if (!existsSync(filePath)) {
            throw new Error(`Dataset file not found at: ${filePath}`);
        }
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim().length > 0);
        return {
            datasetId,
            filePath,
            lineCount: lines.length
        };
    }
    async ValidateDataset(datasetId) {
        const ade = this.getAde();
        if (ade) {
            return await ade.ValidateDataset(datasetId);
        }
        const datasetDir = path.resolve(this.workspaceRoot, '.aegis/datasets', datasetId);
        const filePath = path.join(datasetDir, 'processed/dataset.jsonl');
        return existsSync(filePath);
    }
    async SplitDataset(datasetId, trainRatio = 0.8, valRatio = 0.1, testRatio = 0.1) {
        const loaded = await this.LoadDataset(datasetId);
        const content = await fs.readFile(loaded.filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim().length > 0);
        // Shuffle lines deterministically
        const seededShuffle = (arr) => {
            let seed = 42;
            for (let i = arr.length - 1; i > 0; i--) {
                const r = (seed * 9301 + 49297) % 233280;
                const j = Math.floor((r / 233280.0) * (i + 1));
                seed = r;
                const temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        };
        seededShuffle(lines);
        const total = lines.length;
        const trainEnd = Math.round(total * trainRatio);
        const valEnd = trainEnd + Math.round(total * valRatio);
        const trainLines = lines.slice(0, trainEnd);
        const valLines = lines.slice(trainEnd, valEnd);
        const testLines = lines.slice(valEnd);
        const splitDir = path.resolve(this.workspaceRoot, '.aegis/datasets', datasetId, 'splits');
        if (!existsSync(splitDir)) {
            await fs.mkdir(splitDir, { recursive: true });
        }
        const trainPath = path.join(splitDir, 'train.jsonl');
        const valPath = path.join(splitDir, 'validation.jsonl');
        const testPath = path.join(splitDir, 'test.jsonl');
        await fs.writeFile(trainPath, trainLines.join('\n') + '\n', 'utf8');
        await fs.writeFile(valPath, valLines.join('\n') + '\n', 'utf8');
        await fs.writeFile(testPath, testLines.join('\n') + '\n', 'utf8');
        return { trainPath, valPath, testPath };
    }
    async DatasetStatistics(datasetId) {
        const ade = this.getAde();
        if (ade) {
            return await ade.DatasetStatistics(datasetId);
        }
        return { status: 'Ade Unavailable', samples: 100 };
    }
    DatasetStatus(datasetId) {
        const ade = this.getAde();
        if (ade) {
            return ade.DatasetStatus(datasetId);
        }
        return 'Processed';
    }
}
//# sourceMappingURL=DatasetManager.js.map