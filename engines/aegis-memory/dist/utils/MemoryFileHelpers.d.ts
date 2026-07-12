/**
 * Calculates SHA-256 checksum of a given string.
 */
export declare function calculateChecksum(content: string): string;
/**
 * Reads a memory file asynchronously as a UTF-8 string.
 * Returns empty string if the file does not exist.
 */
export declare function readMemoryFile(filePath: string): Promise<string>;
/**
 * Writes a memory file atomically by writing to a temporary file first,
 * then renaming it. Creates parent directories if missing.
 * Returns the SHA-256 checksum of the written content.
 */
export declare function writeMemoryFile(filePath: string, content: string): Promise<string>;
/**
 * Appends content to a file. Reads the existing file, appends the content,
 * and writes the result atomically.
 * Returns the SHA-256 checksum of the updated content.
 */
export declare function appendMemoryFile(filePath: string, content: string): Promise<string>;
/**
 * Serializes data to JSON and writes it atomically to the target file.
 * Returns the checksum of the serialized string.
 */
export declare function safeJsonWrite(filePath: string, data: any): Promise<string>;
/**
 * Reads a JSON file, returning the parsed content.
 * Fallback to defaultValue if file does not exist or JSON parsing fails.
 */
export declare function safeJsonRead<T = any>(filePath: string, defaultValue: T): Promise<T>;
