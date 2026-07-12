import { EngineRegistryEntry } from './types/EngineRegistry.js';
export interface ValidatedEngine {
    entry: EngineRegistryEntry;
    moduleUrl: string;
    classRef: any;
}
export declare class RegistryLoader {
    private static getRepositoryRoot;
    static loadRegistry(context: any): Promise<ValidatedEngine[]>;
}
