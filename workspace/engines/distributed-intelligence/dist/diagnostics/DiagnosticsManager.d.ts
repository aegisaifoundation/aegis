import { PreflightReport } from './StartupDiagnostics.js';
import { CrashReporter, CrashRecord } from './CrashReporter.js';
export interface DiagnosticReport {
    timestamp: string;
    executablePath: string;
    preflight: PreflightReport;
    lastCrash: CrashRecord | null;
    totalCrashes: number;
    diagnosticAdvice: string;
}
export declare class DiagnosticsManager {
    private crashReporter;
    constructor();
    getCrashReporter(): CrashReporter;
    generateReport(executablePath: string): DiagnosticReport;
    private formulateAdvice;
}
export default DiagnosticsManager;
//# sourceMappingURL=DiagnosticsManager.d.ts.map