export class CrashReporter {
    crashes = [];
    recordCrash(exitCode, signal) {
        const probableReason = this.determineReason(exitCode, signal);
        const record = {
            timestamp: new Date().toISOString(),
            exitCode,
            signal,
            probableReason
        };
        this.crashes.push(record);
        return record;
    }
    getCrashHistory() {
        return this.crashes;
    }
    getLastCrash() {
        return this.crashes.length > 0 ? this.crashes[this.crashes.length - 1] : null;
    }
    clearHistory() {
        this.crashes = [];
    }
    determineReason(exitCode, signal) {
        if (signal) {
            if (signal === 'SIGSEGV')
                return 'Segmentation fault (native memory access violation)';
            if (signal === 'SIGABRT')
                return 'Program abort (often thrown by assert failure or C++ exception)';
            if (signal === 'SIGILL')
                return 'Illegal instruction (unsupported CPU instruction or corrupted binary)';
            if (signal === 'SIGKILL')
                return 'Process killed by external supervisor or OS Out-of-Memory';
            return `Terminated by signal ${signal}`;
        }
        if (exitCode !== null) {
            if (exitCode === 0)
                return 'Normal termination';
            if (exitCode === 1)
                return 'General run-time error or unhandled exception';
            if (exitCode === 139)
                return 'Segmentation fault (exit code mapping of SIGSEGV)';
            if (exitCode === 134)
                return 'Program abort (exit code mapping of SIGABRT)';
        }
        return 'Unknown crash reason';
    }
}
export default CrashReporter;
//# sourceMappingURL=CrashReporter.js.map