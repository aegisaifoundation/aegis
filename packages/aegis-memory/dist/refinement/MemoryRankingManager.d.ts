export interface RankedMemoryItem {
    id: string;
    sessionId: string;
    text: string;
    importance: number;
    confidence: number;
    accessFrequency: number;
    createdAt: string;
    lastAccessedAt: string;
    decayRate: number;
}
export interface ArchiveRecord {
    archiveId: string;
    sessionId: string;
    archivedAt: string;
    items: Omit<RankedMemoryItem, 'vector'>[];
}
export declare class MemoryRankingManager {
    private static instance;
    static getInstance(): MemoryRankingManager;
    private getDatabasePath;
    private getArchiveDirectory;
    load(sessionId: string): Promise<RankedMemoryItem[]>;
    save(sessionId: string, items: RankedMemoryItem[]): Promise<void>;
    insert(id: string, sessionId: string, text: string, importance?: number, confidence?: number, decayRate?: number): Promise<void>;
    recordAccess(id: string): Promise<void>;
    private getActiveSessionId;
    calculateScore(item: RankedMemoryItem, virtualTimeOffsetMs?: number): number;
    sweepSessionMemory(sessionId: string, virtualTimeOffsetMs?: number, archiveThreshold?: number): Promise<{
        active: RankedMemoryItem[];
        archived: Omit<RankedMemoryItem, 'vector'>[];
    }>;
    getSessionItems(sessionId: string): Promise<RankedMemoryItem[]>;
}
export declare const memoryRankingManager: MemoryRankingManager;
