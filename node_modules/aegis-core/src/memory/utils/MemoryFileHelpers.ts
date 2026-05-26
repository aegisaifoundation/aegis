import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Calculates SHA-256 checksum of a given string.
 */
export function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Reads a memory file asynchronously as a UTF-8 string.
 * Returns empty string if the file does not exist.
 */
export async function readMemoryFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

/**
 * Writes a memory file atomically by writing to a temporary file first,
 * then renaming it. Creates parent directories if missing.
 * Returns the SHA-256 checksum of the written content.
 */
export async function writeMemoryFile(filePath: string, content: string): Promise<string> {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, content, 'utf8');
  await fs.rename(tempPath, filePath);
  
  return calculateChecksum(content);
}

/**
 * Appends content to a file. Reads the existing file, appends the content,
 * and writes the result atomically.
 * Returns the SHA-256 checksum of the updated content.
 */
export async function appendMemoryFile(filePath: string, content: string): Promise<string> {
  const current = await readMemoryFile(filePath);
  const updated = current + content;
  return await writeMemoryFile(filePath, updated);
}

/**
 * Serializes data to JSON and writes it atomically to the target file.
 * Returns the checksum of the serialized string.
 */
export async function safeJsonWrite(filePath: string, data: any): Promise<string> {
  const serialized = JSON.stringify(data, null, 2);
  return await writeMemoryFile(filePath, serialized);
}

/**
 * Reads a JSON file, returning the parsed content.
 * Fallback to defaultValue if file does not exist or JSON parsing fails.
 */
export async function safeJsonRead<T = any>(filePath: string, defaultValue: T): Promise<T> {
  const raw = await readMemoryFile(filePath);
  if (!raw.trim()) {
    return defaultValue;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Failed to parse JSON file at ${filePath}:`, err);
    return defaultValue;
  }
}
