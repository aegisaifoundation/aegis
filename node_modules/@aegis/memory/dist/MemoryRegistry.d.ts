import { Memory } from './Memory.js';
export declare class MemoryRegistry {
    private static instance;
    private modules;
    static getInstance(): MemoryRegistry;
    register(name: string, module: Memory): void;
    unregister(name: string): void;
    get(name: string): Memory | undefined;
    list(): Memory[];
}
export declare const memoryRegistry: MemoryRegistry;
