export declare class StructuredLogger {
    private static instance;
    static getInstance(): StructuredLogger;
    log(level: 'info' | 'warn' | 'error', event: string, sessionId?: string, details?: Record<string, any>): void;
    info(event: string, sessionId?: string, details?: Record<string, any>): Promise<void>;
    warn(event: string, sessionId?: string, details?: Record<string, any>): Promise<void>;
    error(event: string, sessionId?: string, details?: Record<string, any>): Promise<void>;
    flush(): Promise<void>;
    shutdown(): Promise<void>;
}
export declare const logger: StructuredLogger;
