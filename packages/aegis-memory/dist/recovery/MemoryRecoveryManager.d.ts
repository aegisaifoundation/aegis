import { SessionMetadata } from '../interfaces/MemoryTypes.js';
export declare class MemoryRecoveryManager {
    /**
     * Attempts to restore corrupted memory files (history.json, session-memory.md, working-memory.md)
     * from the latest point-in-time snapshot.
     */
    static recoverFromSnapshot(sessionId: string, fileType: 'history' | 'sessionMemory' | 'workingMemory', targetFilePath: string): Promise<boolean>;
    /**
     * Repairs metadata.json by regenerating standard keys if it is unreadable.
     */
    static repairMetadata(sessionId: string, metadataFilePath: string, historyChecksum?: string, sessionChecksum?: string, workingChecksum?: string): Promise<SessionMetadata>;
}
