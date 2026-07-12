import { IEngine } from '@aegis/sdk';
export declare class EngineManager {
    private engines;
    private startedEngines;
    private context;
    private isSubscribed;
    register(engine: IEngine): void;
    get(id: string): IEngine | undefined;
    list(): IEngine[];
    discoverAndLoad(context: any): Promise<void>;
    reload(): Promise<void>;
    reloadEngine(engineId: string): Promise<void>;
    startEngine(engineId: string): Promise<void>;
    stopEngine(engineId: string): Promise<void>;
    getLoadOrder(): string[];
    initializeAll(context: any): Promise<void>;
    startAll(): Promise<void>;
    shutdownAll(): Promise<void>;
}
export declare const engineManager: EngineManager;
