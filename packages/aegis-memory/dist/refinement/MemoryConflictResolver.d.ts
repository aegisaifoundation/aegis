import { SessionState } from '../interfaces/MemoryTypes.js';
export interface MergeResult {
    mergedState: SessionState;
    hasConflicts: boolean;
    conflicts: string[];
}
export declare class MemoryConflictResolver {
    private static instance;
    static getInstance(): MemoryConflictResolver;
    resolve(localState: SessionState, remoteState: SessionState): MergeResult;
}
export declare const memoryConflictResolver: MemoryConflictResolver;
