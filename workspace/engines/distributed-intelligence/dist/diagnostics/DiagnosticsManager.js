import { StartupDiagnostics } from './StartupDiagnostics.js';
import { CrashReporter } from './CrashReporter.js';
export class DiagnosticsManager {
    crashReporter = new CrashReporter();
    constructor() { }
    getCrashReporter() {
        return this.crashReporter;
    }
    generateReport(executablePath) {
        const preflight = StartupDiagnostics.runPreflightChecks(executablePath);
        const lastCrash = this.crashReporter.getLastCrash();
        const crashes = this.crashReporter.getCrashHistory();
        const report = {
            timestamp: new Date().toISOString(),
            executablePath,
            preflight,
            lastCrash,
            totalCrashes: crashes.length,
            diagnosticAdvice: this.formulateAdvice(preflight, lastCrash)
        };
        return report;
    }
    formulateAdvice(preflight, lastCrash) {
        if (!preflight.passed) {
            if (preflight.errors.some(e => e.includes('does not exist'))) {
                return 'Verify the build outputs by running "npm run build" in the package directory. Ensure build scripts complete without errors.';
            }
            if (preflight.errors.some(e => e.includes('permissions'))) {
                return 'Change the file permissions of the executable to permit reading and execution. Use "chmod +x" on POSIX hosts.';
            }
            return 'Resolve the pre-flight check failures listed in the report.';
        }
        if (lastCrash) {
            if (lastCrash.signal === 'SIGSEGV' || lastCrash.exitCode === 139) {
                return 'A segmentation fault occurred. This points to a C++ memory leak or invalid access. Check your native logs or run inside a debugger.';
            }
            if (lastCrash.signal === 'SIGABRT' || lastCrash.exitCode === 134) {
                return 'The C++ runtime aborted execution. This typically indicates a failed assertion or an uncaught native exception.';
            }
            if (lastCrash.exitCode === 1) {
                return 'The engine process returned general runtime failure. Check the stdout/stderr logs above for error details.';
            }
        }
        return 'No active issues detected. Ensure configurations and ports do not conflict with other systems.';
    }
}
export default DiagnosticsManager;
//# sourceMappingURL=DiagnosticsManager.js.map