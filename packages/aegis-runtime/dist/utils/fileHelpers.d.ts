export declare function calculateChecksum(content: string): string;
export declare function readMemoryFile(filePath: string): Promise<string>;
export declare function writeMemoryFile(filePath: string, content: string): Promise<string>;
export declare function safeJsonWrite(filePath: string, data: any): Promise<string>;
export declare function safeJsonRead<T = any>(filePath: string, defaultValue: T): Promise<T>;
