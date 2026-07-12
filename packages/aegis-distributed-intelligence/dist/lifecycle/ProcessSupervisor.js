import { spawn } from 'child_process';
import fs from 'fs';
import { EventEmitter } from 'events';
export class ProcessSupervisor extends EventEmitter {
    childProcess = null;
    constructor() {
        super();
    }
    validateExecutable(executablePath) {
        if (!executablePath) {
            throw new Error('ProcessSupervisor: Executable path cannot be empty');
        }
        if (!fs.existsSync(executablePath)) {
            throw new Error(`ProcessSupervisor: Executable not found at path "${executablePath}"`);
        }
        try {
            fs.accessSync(executablePath, fs.constants.X_OK);
        }
        catch {
            // Access check might fail on Windows, but we still proceed
            if (process.platform !== 'win32') {
                throw new Error(`ProcessSupervisor: Executable at "${executablePath}" does not have execute permissions`);
            }
        }
    }
    spawn(executablePath, args = []) {
        this.validateExecutable(executablePath);
        if (this.childProcess && !this.childProcess.killed) {
            throw new Error('ProcessSupervisor: A process is already running under this supervisor');
        }
        const cp = spawn(executablePath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        });
        this.childProcess = cp;
        this.emit('spawned', cp);
        cp.on('exit', (code, signal) => {
            this.childProcess = null;
            this.emit('exit', code, signal);
        });
        cp.on('error', (err) => {
            this.emit('error', err);
        });
        return cp;
    }
    getChildProcess() {
        return this.childProcess;
    }
    isProcessRunning() {
        return !!this.childProcess && !this.childProcess.killed;
    }
}
export default ProcessSupervisor;
//# sourceMappingURL=ProcessSupervisor.js.map