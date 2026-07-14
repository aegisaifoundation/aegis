export declare class NodeRuntime {
    private kernelApi;
    boot(): Promise<void>;
    shutdown(): Promise<void>;
    getStatus(): string;
    private getEngineManager;
    loadEngine(engineId: string): Promise<void>;
    unloadEngine(engineId: string): Promise<void>;
    startEngine(engineId: string): Promise<void>;
    stopEngine(engineId: string): Promise<void>;
    restartEngine(engineId: string): Promise<void>;
    getEngines(): Array<{
        id: string;
        name: string;
        state: string;
    }>;
}
