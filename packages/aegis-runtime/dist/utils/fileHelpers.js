import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
export function calculateChecksum(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
export async function readMemoryFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            return '';
        }
        throw err;
    }
}
export async function writeMemoryFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
    }
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf8');
    let retries = 5;
    while (retries > 0) {
        try {
            await fs.rename(tempPath, filePath);
            break;
        }
        catch (err) {
            retries--;
            if (retries === 0) {
                await fs.rm(tempPath, { force: true }).catch(() => { });
                throw err;
            }
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }
    return calculateChecksum(content);
}
export async function safeJsonWrite(filePath, data) {
    const serialized = JSON.stringify(data, null, 2);
    return await writeMemoryFile(filePath, serialized);
}
export async function safeJsonRead(filePath, defaultValue) {
    const raw = await readMemoryFile(filePath);
    if (!raw.trim()) {
        return defaultValue;
    }
    try {
        return JSON.parse(raw);
    }
    catch (err) {
        console.error(`Failed to parse JSON file at ${filePath}:`, err);
        return defaultValue;
    }
}
