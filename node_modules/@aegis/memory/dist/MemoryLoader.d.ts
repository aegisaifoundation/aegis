import { Memory } from './Memory.js';
export declare class MemoryLoader {
    private getAegisCoreRoot;
    getWorkspaceRoot(): string;
    getMemoryModulesDir(): string;
    discoverMemoryModules(): Promise<string[]>;
    loadMemoryModule(moduleName: string): Promise<Memory>;
    initializeMemoryModule(moduleName: string): Promise<void>;
}
export declare const memoryLoader: MemoryLoader;
