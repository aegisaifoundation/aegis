export declare class UnifiedConfig {
    private static cache;
    static resolve<T = any>(engineId: string, key: string, sessionId?: string, defaultValue?: T): T;
    static setEngineConfig(engineId: string, key: string, value: any): void;
    static clearCache(): void;
}
