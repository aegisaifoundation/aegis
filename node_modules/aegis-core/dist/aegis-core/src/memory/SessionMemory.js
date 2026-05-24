import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_MEMORY_DIR = path.resolve(__dirname, '../../../.memory');
export class SessionMemory {
    sessionFile;
    constructor(sessionId = 'default', memoryDir = DEFAULT_MEMORY_DIR) {
        this.sessionFile = path.join(memoryDir, `${sessionId}.json`);
    }
    async load() {
        try {
            const data = await fs.readFile(this.sessionFile, 'utf-8');
            return JSON.parse(data);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }
    async save(memories) {
        const dir = path.dirname(this.sessionFile);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.sessionFile, JSON.stringify(memories, null, 2), 'utf-8');
    }
}
