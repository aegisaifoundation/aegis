import { IEngine } from '@aegis/sdk';
export declare class EngineManager {
    private engines;
    private startedEngines;
    register(engine: IEngine): void;
    get(id: string): IEngine | undefined;
    list(): IEngine[];
    getLoadOrder(): string[];
    initializeAll(context: any): Promise<void>;
    startAll(): Promise<void>;
    shutdownAll(): Promise<void>;
}
export declare const engineManager: EngineManager;
