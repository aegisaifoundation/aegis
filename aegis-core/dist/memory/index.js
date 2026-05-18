import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_DIR = path.resolve(__dirname, '../../../.memory');
export class MemoryManager {
    sessionId;
    sessionFile;
    memories = [];
    constructor(sessionId = 'default') {
        this.sessionId = sessionId;
        this.sessionFile = path.join(MEMORY_DIR, `${this.sessionId}.json`);
    }
    async init() {
        try {
            await fs.mkdir(MEMORY_DIR, { recursive: true });
            try {
                const data = await fs.readFile(this.sessionFile, 'utf-8');
                this.memories = JSON.parse(data);
            }
            catch (err) {
                if (err.code === 'ENOENT') {
                    this.memories = [];
                    await this.save();
                }
                else {
                    throw err;
                }
            }
        }
        catch (err) {
            console.error('Failed to initialize memory:', err);
        }
    }
    async addMemory(role, content) {
        this.memories.push({ role, content, timestamp: new Date().toISOString() });
        await this.save();
    }
    getMemories() {
        return this.memories;
    }
    async clear() {
        this.memories = [];
        await this.save();
    }
    async save() {
        await fs.writeFile(this.sessionFile, JSON.stringify(this.memories, null, 2), 'utf-8');
    }
}
export const memoryManager = new MemoryManager();
