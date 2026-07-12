export interface CrashRecord {
    timestamp: string;
    exitCode: number | null;
    signal: string | null;
    probableReason: string;
}
export declare class CrashReporter {
    private crashes;
    recordCrash(exitCode: number | null, signal: string | null): CrashRecord;
    getCrashHistory(): CrashRecord[];
    getLastCrash(): CrashRecord | null;
    clearHistory(): void;
    private determineReason;
}
export default CrashReporter;
//# sourceMappingURL=CrashReporter.d.ts.map