import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
export declare class ProcessSupervisor extends EventEmitter {
    private childProcess;
    constructor();
    validateExecutable(executablePath: string): void;
    spawn(executablePath: string, args?: string[]): ChildProcess;
    getChildProcess(): ChildProcess | null;
    isProcessRunning(): boolean;
}
export default ProcessSupervisor;
//# sourceMappingURL=ProcessSupervisor.d.ts.map