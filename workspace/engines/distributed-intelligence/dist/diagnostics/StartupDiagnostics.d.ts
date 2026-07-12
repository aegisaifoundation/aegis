export interface PreflightReport {
    passed: boolean;
    errors: string[];
    warnings: string[];
}
export declare class StartupDiagnostics {
    static runPreflightChecks(executablePath: string): PreflightReport;
}
export default StartupDiagnostics;
//# sourceMappingURL=StartupDiagnostics.d.ts.map