import { MemoryEvent } from '../MemoryEvent.js';
export declare class AuditLogger {
    private static getLogPath;
    static handleEvent(event: MemoryEvent): Promise<void>;
}
