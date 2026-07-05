export interface ReflectionRecord {
    reflectionId: string;
    sessionId: string;
    timestamp: string;
    whatWorked: string[];
    whatFailed: string[];
    heuristicsGenerated: string[];
    futureRules: string[];
}
export declare class MemoryReflectionManager {
    private static instance;
    private reflections;
    private isLoaded;
    static getInstance(): MemoryReflectionManager;
    private getDatabasePath;
    load(): Promise<void>;
    save(): Promise<void>;
    private saveReflection;
    reflect(sessionId: string, actor?: string): Promise<ReflectionRecord | null>;
    getSessionReflections(sessionId: string): Promise<ReflectionRecord[]>;
}
export declare const memoryReflectionManager: MemoryReflectionManager;
