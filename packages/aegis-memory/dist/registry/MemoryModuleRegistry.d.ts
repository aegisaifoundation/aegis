import { IMemoryModule } from '../interfaces/IMemoryModule.js';
import { MemoryType } from '../interfaces/MemoryTypes.js';
export declare class MemoryModuleRegistry {
    private static instance;
    private modules;
    static getInstance(): MemoryModuleRegistry;
    register(name: string, module: IMemoryModule): void;
    unregister(name: string): void;
    resolve(name: string): IMemoryModule | undefined;
    resolveByType(type: MemoryType): IMemoryModule[];
    list(): IMemoryModule[];
    clear(): void;
}
export declare const memoryModuleRegistry: MemoryModuleRegistry;
