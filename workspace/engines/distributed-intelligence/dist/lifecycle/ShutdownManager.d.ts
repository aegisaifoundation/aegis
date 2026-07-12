import { ChildProcess } from 'child_process';
export declare class ShutdownManager {
    private static SHUTDOWN_TIMEOUT_MS;
    static terminate(cp: ChildProcess | null): Promise<void>;
}
export default ShutdownManager;
//# sourceMappingURL=ShutdownManager.d.ts.map